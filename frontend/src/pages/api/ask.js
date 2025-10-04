import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { callMcpTool } from "./mcpClient.js";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || "800", 10);

// Define the MCP proxy tool
// NOTE: Anthropic requires tool names to match /^[a-zA-Z0-9_-]{1,128}$/ (no dots),
// so we use `mcp_call_tool` instead of `mcp.call_tool`.
const tools = [
    {
        name: "mcp_call_tool",
        description:
            "Proxy to your Model Context Protocol server. Provide {tool: string, args: object}. Returns the tool's output.",
        input_schema: {
            type: "object",
            properties: {
                tool: { type: "string", description: "MCP tool name" },
                args: { type: "object", description: "JSON args for that MCP tool" }
            },
            required: ["tool"]
        }
    }
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};
        const { question } = body;
        if (!question || typeof question !== "string") {
            return res.status(400).json({ error: "Missing 'question' string" });
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        // Start the conversation with Claude
        let messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `You are an assistant that can optionally call MCP tools via the 'mcp.call_tool' function.
If helpful, you may call an MCP tool by name with JSON args.
Otherwise, answer directly.

Question: ${question}`
                    }
                ]
            }
        ];

        // Ask Claude - allow tool calls
        let response = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: CLAUDE_MAX_TOKENS,
            tools,
            messages
        });

        // See if Claude requested any MCP tool calls
        const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

        if (toolUseBlocks.length > 0) {
            const toolResults = [];
            for (const tu of toolUseBlocks) {
                try {
                    if (tu.name !== "mcp_call_tool") {
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: tu.id,
                            content: [{ type: "text", text: `Unsupported tool: ${tu.name}` }]
                        });
                        continue;
                    }

                    const { tool, args } = tu.input || {};
                    const mcpText = await callMcpTool(tool, args || {});
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: tu.id,
                        content: [{ type: "text", text: mcpText }]
                    });
                } catch (err) {
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: tu.id,
                        is_error: true,
                        content: [{ type: "text", text: `MCP call failed: ${err.message}` }]
                    });
                }
            }

            // Add results to the chat and ask Claude to continue
            messages.push({ role: "assistant", content: response.content });
            messages.push({ role: "user", content: toolResults });

            response = await anthropic.messages.create({
                model: CLAUDE_MODEL,
                max_tokens: CLAUDE_MAX_TOKENS,
                tools,
                messages
            });
        }

        // Gather Claude's final answer
        const finalText = (response.content || [])
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n\n");

        return res.status(200).json({ ok: true, answer: finalText });
    } catch (err) {
        console.error("Error in /api/ask:", err);
        return res.status(500).json({ error: err.message });
    }
}
