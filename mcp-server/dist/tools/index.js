// Import all tool modules
import * as add from "./add.js";
import * as fetchWeather from "./fetch-weather.js";
import * as getRecentEonetEvents from "./get-recent-eonet-events.js";
import * as getApod from "./get-apod.js";
import * as getMarsRoverPhotos from "./get-mars-rover-photos.js";
import * as getNearEarthObjects from "./get-near-earth-objects.js";
import * as getIssLocation from "./get-iss-location.js";
import * as getSpaceWeather from "./get-space-weather.js";
import * as getLaunchSchedule from "./get-launch-schedule.js";
import * as correlateMissionData from "./correlate-mission-data.js";
import * as calculateLaunchWindow from "./calculate-launch-window.js";
import * as searchScholar from "./search-scholar.js";
import * as searchNews from "./search-news.js";
import * as searchLocal from "./search-local.js";
import * as searchFlights from "./search-flights.js";
import * as searchTrends from "./search-trends.js";
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
    getApod.register(server);
    getMarsRoverPhotos.register(server);
    getNearEarthObjects.register(server);
    getIssLocation.register(server);
    getSpaceWeather.register(server);
    getLaunchSchedule.register(server);
    correlateMissionData.register(server);
    calculateLaunchWindow.register(server);
    searchScholar.register(server);
    searchNews.register(server);
    searchLocal.register(server);
    searchFlights.register(server);
    searchTrends.register(server);
    //   bmi.register(server);
    //   weather.register(server);
    //   listFiles.register(server);
}
