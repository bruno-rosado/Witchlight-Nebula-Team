// Server-only MCP client helper for Next.js API routes
// This file lives under src/pages/api so Next.js will only load it on the server.
import { Client as McpClient } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let cachedClient = null;

export async function getMcpClient() {
  if (cachedClient) return cachedClient;

  // Default to localhost (mcp-server) if env var not provided.
  const url = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";
  if (!url) throw new Error("MCP_SERVER_URL is not set");

  const transport = new StreamableHTTPClientTransport(url, { fetch: fetch });
  const client = new McpClient({ name: 'next-api-mcp-client', version: '0.1.0' });
  await client.connect(transport);
  cachedClient = client;
  return client;
}

export async function callMcpTool(toolName, args = {}) {
  const client = await getMcpClient();

  // callTool expects an object with { name, args }
  const result = await client.callTool({ name: toolName, args });

  // Normalize result content into human-friendly text
  let text = "";
  for (const block of result.content || []) {
    if (block.type === "text" && block.text) text += block.text + "\n";
    else if (block.type === "json" && block.json) text += JSON.stringify(block.json) + "\n";
  }
  return text.trim() || JSON.stringify(result);
}
