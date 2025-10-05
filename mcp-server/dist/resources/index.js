import * as eonetEvents from "./eonent-events.js";
/**
 * registerAll(server)
 * Registers all resources in one call.
 */
export async function registerAll(server) {
    eonetEvents.register(server);
}
