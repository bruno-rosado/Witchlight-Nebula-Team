// Import all tool modules
import * as add from "./add.js";
import * as fetchWeather from "./fetch-weather.js";
import * as getRecentEonetEvents from "./get-recent-eonet-events.js";
// import * as bmi from './calculate-bmi.js';
// import * as weather from './fetch-weather.js';
// import * as listFiles from './list-files.js';
/**
 * registerAll(server)
 * Centralized function to register all available tools
 */
export async function registerAll(server) {
    add.register(server);
    fetchWeather.register(server);
    getRecentEonetEvents.register(server);
    //   bmi.register(server);
    //   weather.register(server);
    //   listFiles.register(server);
}
