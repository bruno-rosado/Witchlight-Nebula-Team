// -------------------------- search-local.ts -------------------------
// MCP tool that searches Google Maps for local businesses and services.
// Uses SerpAPI to find facilities, hotels, services near launch sites.
// --------------------------------------------------------------------
import { z } from "zod";
export function register(server) {
    server.registerTool("search-local", {
        title: "Search Local Places",
        description: "Search Google Maps for local businesses, facilities, and services. Find hotels, restaurants, emergency services, and infrastructure near launch sites or NASA facilities.",
        inputSchema: z.object({
            query: z.string().describe("Search query (e.g., 'hotels near Kennedy Space Center', 'hospitals in Cape Canaveral')"),
            location: z.string().optional().describe("Location/address to search around (e.g., 'Kennedy Space Center, FL', 'Cape Canaveral')"),
            latitude: z.number().optional().describe("Latitude for precise location search"),
            longitude: z.number().optional().describe("Longitude for precise location search"),
            num_results: z.number().optional().describe("Number of results to return (default: 10, max: 20)")
        }).shape,
        outputSchema: z.object({
            places: z.array(z.object({
                title: z.string(),
                address: z.string(),
                phone: z.string().optional(),
                rating: z.number().optional(),
                distance: z.string().optional()
            }))
        }).shape,
    }, async ({ query, location, latitude, longitude, num_results = 10 }) => {
        try {
            const apiKey = process.env.SERP_API_KEY;
            if (!apiKey) {
                throw new Error('SERP_API_KEY not configured in environment');
            }
            // Build SerpAPI URL for Google Maps
            const params = new URLSearchParams({
                engine: 'google_maps',
                q: query,
                api_key: apiKey,
                num: String(Math.min(num_results, 20)),
                type: 'search'
            });
            // Use either location string or lat/lng coordinates
            if (latitude !== undefined && longitude !== undefined) {
                params.append('ll', `@${latitude},${longitude},15z`);
            }
            else if (location) {
                params.append('location', location);
            }
            const url = `https://serpapi.com/search?${params.toString()}`;
            // Fetch data from SerpAPI
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`SerpAPI responded with ${resp.status}`);
            }
            const data = await resp.json();
            // Check for errors
            if (data.error) {
                throw new Error(data.error);
            }
            // Parse local results
            const places = (data.local_results || []).map((item) => ({
                title: item.title,
                address: item.address,
                phone: item.phone,
                rating: item.rating,
                reviews: item.reviews,
                type: item.type,
                hours: item.hours,
                description: item.description,
                website: item.website,
                thumbnail: item.thumbnail,
                gps_coordinates: item.gps_coordinates,
                place_id: item.place_id
            }));
            if (places.length === 0) {
                return {
                    content: [{ type: 'text', text: `No local places found for: "${query}"` }],
                    structuredContent: { places: [] },
                };
            }
            // Format as human-readable text
            const placeDescriptions = places.map((place, index) => {
                let desc = `${index + 1}. **${place.title}**`;
                if (place.rating) {
                    desc += ` ⭐ ${place.rating}${place.reviews ? ` (${place.reviews} reviews)` : ''}`;
                }
                if (place.type) {
                    desc += `\n   📍 **Type**: ${place.type}`;
                }
                if (place.address) {
                    desc += `\n   🏠 **Address**: ${place.address}`;
                }
                if (place.phone) {
                    desc += `\n   📞 **Phone**: ${place.phone}`;
                }
                if (place.hours) {
                    desc += `\n   🕐 **Hours**: ${place.hours}`;
                }
                if (place.website) {
                    desc += `\n   🌐 **Website**: ${place.website}`;
                }
                if (place.gps_coordinates) {
                    desc += `\n   🗺️ **Coordinates**: ${place.gps_coordinates.latitude}, ${place.gps_coordinates.longitude}`;
                }
                return desc;
            }).join('\n\n');
            const locationText = location || (latitude && longitude ? `${latitude}, ${longitude}` : 'specified area');
            const summary = `📍 **Local Places Search**
Query: "${query}"
Location: ${locationText}
Found ${places.length} place${places.length !== 1 ? 's' : ''}:\n\n${placeDescriptions}`;
            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: {
                    query,
                    location: location || { latitude, longitude },
                    places,
                    count: places.length
                },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Failed to search local places: ${message}` }],
                structuredContent: { places: [], error: message },
            };
        }
    });
}
