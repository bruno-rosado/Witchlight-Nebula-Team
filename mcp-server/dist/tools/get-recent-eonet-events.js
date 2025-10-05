// -------------------------- get-recent-eonet-events.ts -------------------------
// MCP tool that fetches the most recent natural events from EONET API.
// Returns formatted information about recent events like storms, wildfires, etc.
// --------------------------------------------------------------------
import { z } from "zod";
export function register(server) {
    server.registerTool("get-recent-eonet-events", {
        title: "Get Recent EONET Events",
        description: "Fetch the most recent natural events from NASA's EONET (Earth Observatory Natural Event Tracker) API",
        inputSchema: z.object({
            limit: z.number().optional().describe("Number of events to return (default: 5)"),
            status: z.enum(["open", "closed", "all"]).optional().describe("Filter by event status (default: open)")
        }).shape,
        outputSchema: z.object({
            events: z.array(z.object({
                id: z.string(),
                title: z.string(),
                category: z.string(),
                date: z.string(),
                coordinates: z.array(z.number()).optional(),
                magnitude: z.number().optional(),
                link: z.string()
            }))
        }).shape,
    }, async ({ limit = 5, status = "open" }) => {
        try {
            // Build the EONET API URL
            const params = new URLSearchParams({
                limit: String(limit),
                status: status
            });
            const url = `https://eonet.gsfc.nasa.gov/api/v3/events?${params.toString()}`;
            // Fetch data from EONET API
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`EONET API responded with ${resp.status}`);
            }
            const data = await resp.json();
            // Parse and format the events
            const events = (data.events || []).map((event) => {
                // Get the most recent geometry entry
                const latestGeometry = event.geometry?.[event.geometry.length - 1] || {};
                return {
                    id: event.id,
                    title: event.title,
                    category: event.categories?.[0]?.title || "Unknown",
                    date: latestGeometry.date || event.geometry?.[0]?.date || "Unknown",
                    coordinates: latestGeometry.coordinates,
                    magnitude: latestGeometry.magnitudeValue,
                    link: event.link
                };
            });
            // Format as human-readable text
            const eventDescriptions = events.map((event, index) => {
                let desc = `${index + 1}. **${event.title}** (${event.category})
   - Date: ${event.date}`;
                if (event.magnitude) {
                    desc += `\n   - Magnitude: ${event.magnitude} ${event.geometry?.magnitudeUnit || 'kts'}`;
                }
                if (event.coordinates) {
                    desc += `\n   - Location: [${event.coordinates[0]}, ${event.coordinates[1]}]`;
                }
                desc += `\n   - More info: ${event.link}`;
                return desc;
            }).join('\n\n');
            const summary = `Found ${events.length} recent natural events:\n\n${eventDescriptions}`;
            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: { events },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Failed to fetch EONET events: ${message}` }],
                structuredContent: { events: [] },
            };
        }
    });
}
