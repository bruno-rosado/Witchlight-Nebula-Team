// -------------------------- get-iss-location.ts -------------------------
// MCP tool that fetches the current location of the International Space Station.
// Returns real-time ISS position (latitude, longitude) and overhead pass times.
// --------------------------------------------------------------------
import { z } from "zod";
export function register(server) {
    server.registerTool("get-iss-location", {
        title: "Get ISS Location",
        description: "Get the current real-time location of the International Space Station (ISS) and optionally find overhead pass times for a specific location",
        inputSchema: z.object({
            include_passes: z.boolean().optional().describe("Include upcoming ISS overhead pass times (requires lat/lon)"),
            latitude: z.number().optional().describe("Observer latitude for pass predictions (-90 to 90)"),
            longitude: z.number().optional().describe("Observer longitude for pass predictions (-180 to 180)"),
            altitude: z.number().optional().describe("Observer altitude in meters (default: 0)")
        }).shape,
        outputSchema: z.object({
            timestamp: z.number(),
            iss_position: z.object({
                latitude: z.string(),
                longitude: z.string()
            }),
            passes: z.array(z.object({
                risetime: z.number(),
                duration: z.number()
            })).optional()
        }).shape,
    }, async ({ include_passes = false, latitude, longitude, altitude = 0 }) => {
        try {
            // Fetch current ISS position
            const posResp = await fetch('http://api.open-notify.org/iss-now.json');
            if (!posResp.ok) {
                throw new Error(`ISS location API responded with ${posResp.status}`);
            }
            const posData = await posResp.json();
            const issLat = parseFloat(posData.iss_position.latitude);
            const issLon = parseFloat(posData.iss_position.longitude);
            const timestamp = posData.timestamp;
            const date = new Date(timestamp * 1000).toUTCString();
            let summary = `🛰️ **International Space Station - Current Location**\n\n`;
            summary += `📅 **Time**: ${date}\n`;
            summary += `🌍 **Latitude**: ${issLat.toFixed(4)}°\n`;
            summary += `🌍 **Longitude**: ${issLon.toFixed(4)}°\n`;
            summary += `🗺️ **View on Map**: https://www.google.com/maps?q=${issLat},${issLon}\n`;
            const result = {
                timestamp,
                iss_position: posData.iss_position
            };
            // Optionally fetch overhead pass times
            if (include_passes && latitude !== undefined && longitude !== undefined) {
                const params = new URLSearchParams({
                    lat: String(latitude),
                    lon: String(longitude),
                    alt: String(altitude),
                    n: '5' // Get next 5 passes
                });
                const passUrl = `http://api.open-notify.org/iss-pass.json?${params.toString()}`;
                const passResp = await fetch(passUrl);
                if (!passResp.ok) {
                    throw new Error(`ISS pass API responded with ${passResp.status}`);
                }
                const passData = await passResp.json();
                result.passes = passData.response;
                summary += `\n\n⏰ **Upcoming ISS Passes Over Your Location** (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)\n\n`;
                if (passData.response && passData.response.length > 0) {
                    const passDescriptions = passData.response.map((pass, index) => {
                        const riseDate = new Date(pass.risetime * 1000);
                        const duration = Math.floor(pass.duration / 60);
                        const seconds = pass.duration % 60;
                        return `${index + 1}. ${riseDate.toUTCString()}\n   Duration: ${duration}m ${seconds}s`;
                    }).join('\n\n');
                    summary += passDescriptions;
                }
                else {
                    summary += `No upcoming passes found for this location.`;
                }
            }
            else if (include_passes && (latitude === undefined || longitude === undefined)) {
                summary += `\n\n⚠️ **Note**: To get overhead pass times, provide latitude and longitude.`;
            }
            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: result,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Failed to fetch ISS location: ${message}` }],
                structuredContent: { error: message },
            };
        }
    });
}
