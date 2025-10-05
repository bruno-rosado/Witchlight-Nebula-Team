import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as eonetEvents from "./eonent-events.js";

/**
 * registerAll(server)
 * Registers all resources in one call.
 */
export async function registerAll(server: McpServer): Promise<void> {
  eonetEvents.register(server);
}


