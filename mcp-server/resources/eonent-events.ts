import { ResourceTemplate, McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EONET_JSON_PATH =
  process.env.EONET_JSON_PATH ?? path.join(__dirname, "eonet-events.json");

export function register(server: McpServer): void {
  server.registerResource(
    "eonet-events",
    new ResourceTemplate("eonet://events", {
      // MUST return an object with resources array
      list: async () => ({
        resources: [
          {
            uri: "eonet://events",
            name: "eonet-events",
            title: "EONET Events",
            description: "Natural events dataset (EONET).",
            mimeType: "application/json",
          },
        ],
      }),
    }),
    {
      title: "EONET Events",
      description: "Natural events dataset (EONET).",
    },
    async (uri: URL) => {
      const raw = await readFile(EONET_JSON_PATH, "utf8");
      return {
        contents: [{ uri: uri.href, text: raw, mimeType: "application/json" }],
      };
    }
  );
}
