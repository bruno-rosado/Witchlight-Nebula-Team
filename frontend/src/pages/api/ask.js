import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || "800", 10);

const tools = [
  {
    name: "mcp_call_tool",
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

// Stub or import your real MCP caller
async function callMcpTool(tool, args) {
  return `Called MCP tool "${tool}" with args: ${JSON.stringify(args)}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // In Pages Router, Next parses JSON automatically if header is application/json
    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Missing 'question' string" });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const system =
      "You can call the server-side MCP tool named 'mcp.call_tool' to retrieve live data when relevant.";

    const messages = [
      { role: "user", content: [{ type: "text", text: `Question: ${question}` }] }
    ];

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      tools,
      system,
      messages
    });

    const toolUseBlocks = (response.content || []).filter(b => b.type === "tool_use");

    if (toolUseBlocks.length > 0) {
      const results = [];
      for (const tu of toolUseBlocks) {
        if (tu.name !== "mcp.call_tool") {
          results.push(`Unsupported tool: ${tu.name}`);
          continue;
        }
        const { tool, args } = tu.input || {};
        try {
          const out = await callMcpTool(tool, args || {});
          results.push(out);
        } catch (e) {
          results.push(`MCP call failed: ${e?.message ?? String(e)}`);
        }
      }
      return res.status(200).json({ ok: true, answer: results.join("\n\n") });
    }

    const finalText = (response.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n\n");

    return res.status(200).json({ ok: true, answer: finalText });
  } catch (err) {
    console.error("Error in /api/ask:", err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
