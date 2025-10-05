// src/tools/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import all tool modules
import * as add from "./add.js";
import * as fetchWeather from "./fetch-weather.js";
import * as getRecentEonetEvents from "./get-recent-eonet-events.js";
import * as getApod from "./get-apod.js";
import * as getMarsRoverPhotos from "./get-mars-rover-photos.js";
import * as getNearEarthObjects from "./get-near-earth-objects.js";
import * as getIssLocation from "./get-iss-location.js";
// import * as bmi from './calculate-bmi.js';
// import * as weather from './fetch-weather.js';
// import * as listFiles from './list-files.js';

/**
 * registerAll(server)
 * Centralized function to register all available tools
 */
export async function registerAll(server: McpServer) {
  add.register(server);
  fetchWeather.register(server);
  getRecentEonetEvents.register(server);
  getApod.register(server);
  getMarsRoverPhotos.register(server);
  getNearEarthObjects.register(server);
  getIssLocation.register(server);
  //   bmi.register(server);
  //   weather.register(server);
  //   listFiles.register(server);
}
