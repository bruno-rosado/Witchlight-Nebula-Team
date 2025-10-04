// src/tools/index.ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import all tool modules
import * as add from './add.ts';
// import * as bmi from './calculate-bmi.js';
// import * as weather from './fetch-weather.js';
// import * as listFiles from './list-files.js';

/**
 * registerAll(server)
 * Centralized function to register all available tools
 */
export async function registerAll(server: McpServer) {
  add.register(server);
//   bmi.register(server);
//   weather.register(server);
//   listFiles.register(server);
}