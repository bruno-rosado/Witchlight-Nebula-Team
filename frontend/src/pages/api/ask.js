// pages/api/ask.js
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || "4096", 10);

// 1) Tell Claude what tool it may call
const tools = [
  {
    name: "mcp_call_tool", // <-- keep this EXACT name consistent everywhere
    description:
      "Proxy to your MCP server. Provide {tool: string, args: object}. Returns the tool's output.",
    input_schema: {
      type: "object",
      properties: {
        tool: { type: "string" },
        args: { type: "object" }
      },
      required: ["tool"]
    }
  }
];

// 2) Fetch available tools and resources from MCP server
async function getMcpCapabilities() {
  const base = process.env.MCP_URL;
  if (!base) {
    throw new Error("MCP_URL is not set. Example: MCP_URL=http://localhost:4000");
  }

  // Remove /mcp suffix if present, since /list is at the root level
  const baseUrl = base.replace(/\/$/, "").replace(/\/mcp$/, "");

  const res = await fetch(`${baseUrl}/list`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MCP server error ${res.status}: ${text}`);
  }

  return await res.json();
}

// 3) Server-side proxy to your MCP server
// Calls tools via the MCP protocol
async function callMcpTool(tool, args) {
  const base = process.env.MCP_URL;
  if (!base) {
    throw new Error("MCP_URL is not set. Example: MCP_URL=http://localhost:4000");
  }

  // Call the MCP server using JSON-RPC protocol
  const res = await fetch(`${base.replace(/\/$/, "")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: tool,
        arguments: args || {}
      }
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MCP server error ${res.status}: ${text}`);
  }

  const result = await res.json();

  // Handle JSON-RPC response
  if (result.error) {
    throw new Error(`MCP tool error: ${result.error.message}`);
  }

  return result.result;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Missing 'question' string" });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Fetch available tools and resources from MCP server
    const capabilities = await getMcpCapabilities();

    // Build system prompt with available tools and resources
    let system = "You have access to the following MCP tools and resources:\n\n";

    if (capabilities.tools && capabilities.tools.length > 0) {
      system += "TOOLS:\n";
      capabilities.tools.forEach(tool => {
        system += `- ${tool.name}: ${tool.description}\n`;
      });
      system += "\n";
    }

    if (capabilities.resources && capabilities.resources.length > 0) {
      system += "RESOURCES:\n";
      capabilities.resources.forEach(resource => {
        system += `- ${resource.uri}: ${resource.description || resource.name}\n`;
      });
      system += "\n";
    }

    system += "When relevant to answer the user's question, call the 'mcp_call_tool' proxy with the appropriate tool name and arguments.";

    // Start the conversation
    const messages = [
      { role: "user", content: [{ type: "text", text: `Question: ${question}` }] }
    ];

    // Multi-turn agentic loop: keep going until Claude stops requesting tools
    const MAX_TURNS = 10; // Safety limit
    let turnCount = 0;

    while (turnCount < MAX_TURNS) {
      turnCount++;

      // Call Claude
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        tools,
        system,
        messages
      });

      // Add assistant's response to messages
      messages.push({ role: "assistant", content: response.content });

      // Check if Claude used any tools
      const toolUseBlocks = response.content.filter(b => b.type === "tool_use");

      // If no tools used, Claude has finished - return the answer
      if (toolUseBlocks.length === 0) {
        const finalText = response.content
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join("\n\n");

        return res.status(200).json({ ok: true, answer: finalText });
      }

      // Execute all tool calls
      const toolResults = [];

      for (const tu of toolUseBlocks) {
        if (tu.name !== "mcp_call_tool") {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: [{ type: "text", text: `Unsupported tool: ${tu.name}` }]
          });
          continue;
        }

        try {
          const { tool, args } = tu.input || {};
          const out = await callMcpTool(tool, args || {});
          const textOut =
            typeof out === "string" ? out : JSON.stringify(out, null, 2);

          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: [{ type: "text", text: textOut }]
          });
        } catch (e) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: [
              { type: "text", text: `MCP call failed: ${e?.message ?? String(e)}` }
            ],
            is_error: true
          });
        }
      }

      // Add tool results as user message
      messages.push({ role: "user", content: toolResults });

      // Loop continues - Claude will see tool results and decide next step
    }

    // Safety limit reached
    return res.status(500).json({
      error: `Reached maximum turn limit (${MAX_TURNS}). Query too complex.`
    });
  } catch (err) {
    console.error("Error in /api/ask:", err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
