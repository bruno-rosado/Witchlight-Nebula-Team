// pages/api/ask.js
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || "800", 10);

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

// 2) Server-side proxy to your MCP server
// Expect your MCP server to expose POST {MCP_URL}/call with body: { tool, args }
async function callMcpTool(tool, args) {
  const base = process.env.MCP_URL;
  if (!base) {
    throw new Error("MCP_URL is not set. Example: MCP_URL=http://localhost:4000/mcp");
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, args: args || {} })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MCP server error ${res.status}: ${text}`);
  }

  // Be tolerant of different MCP server shapes
  // Prefer JSON, fallback to raw text
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return await res.text();
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

    const system =
      "You can call the server-side MCP tool named 'mcp_call_tool' to retrieve live data when relevant.";

    // Start the conversation
    const messages = [
      { role: "user", content: [{ type: "text", text: `Question: ${question}` }] }
    ];

    // First turn: let Claude decide whether to call a tool
    const first = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      tools,
      system,
      messages
    });

    const contentBlocks = first.content || [];
    const toolUseBlocks = contentBlocks.filter(b => b.type === "tool_use");

    // If Claude asked to use tools, run them, then send tool_result back for a final answer
    if (toolUseBlocks.length > 0) {
      const toolResults = [];

      for (const tu of toolUseBlocks) {
        if (tu.name !== "mcp_call_tool") {
          // Name mismatch would land here; keep names identical to avoid this.
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
          // Normalize to text for Claude (you can pass JSON as string)
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

      // Second turn: give Claude the tool results so it can compose a good final answer
      const followup = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        tools,
        system,
        messages: [
          // prior user
          ...messages,
          // assistant's tool_use blocks from first turn
          { role: "assistant", content: contentBlocks },
          // user's tool_result blocks
          { role: "user", content: toolResults }
        ]
      });

      const finalText = (followup.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n\n");

      return res.status(200).json({ ok: true, answer: finalText });
    }

    // No tools needed; return Claude's direct answer
    const finalText = contentBlocks
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n\n");

    return res.status(200).json({ ok: true, answer: finalText });
  } catch (err) {
    console.error("Error in /api/ask:", err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
