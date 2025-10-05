// -------------------------- get-mars-rover-photos.ts -------------------------
// MCP tool that fetches photos from NASA's Mars Rovers.
// Returns images from Curiosity, Opportunity, Spirit, and Perseverance rovers.
// --------------------------------------------------------------------
import { z } from "zod";
export function register(server) {
    server.registerTool("get-mars-rover-photos", {
        title: "Get Mars Rover Photos",
        description: "Fetch photos from NASA's Mars Rovers (Curiosity, Opportunity, Spirit, Perseverance)",
        inputSchema: z.object({
            rover: z.enum(["curiosity", "opportunity", "spirit", "perseverance"]).describe("Which Mars rover to query"),
            sol: z.number().optional().describe("Martian sol (day) number. If not provided, uses latest photos"),
            earth_date: z.string().optional().describe("Earth date in YYYY-MM-DD format (alternative to sol)"),
            camera: z.string().optional().describe("Camera abbreviation (e.g., FHAZ, RHAZ, MAST, NAVCAM)")
        }).shape,
        outputSchema: z.object({
            photos: z.array(z.object({
                id: z.number(),
                sol: z.number(),
                camera: z.string(),
                img_src: z.string(),
                earth_date: z.string(),
                rover: z.string()
            }))
        }).shape,
    }, async ({ rover, sol, earth_date, camera }) => {
        try {
            const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
            // Build the Mars Rover Photos API URL
            const params = new URLSearchParams({ api_key: apiKey });
            // Add date parameter (sol or earth_date)
            if (sol !== undefined) {
                params.append('sol', String(sol));
            }
            else if (earth_date) {
                params.append('earth_date', earth_date);
            }
            else {
                // Default to sol 1000 if no date specified
                params.append('sol', '1000');
            }
            if (camera) {
                params.append('camera', camera.toLowerCase());
            }
            const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?${params.toString()}`;
            // Fetch data from Mars Rover Photos API
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`NASA Mars Rover API responded with ${resp.status}`);
            }
            const data = await resp.json();
            const photos = data.photos || [];
            if (photos.length === 0) {
                return {
                    content: [{ type: 'text', text: `🔴 No photos found for ${rover} rover with the specified parameters.` }],
                    structuredContent: { photos: [] },
                };
            }
            // Format as human-readable text (limit to first 10 photos)
            const photoDescriptions = photos.slice(0, 10).map((photo, index) => {
                return `${index + 1}. **Photo ID ${photo.id}**
   📅 Sol: ${photo.sol} | Earth Date: ${photo.earth_date}
   📷 Camera: ${photo.camera.full_name} (${photo.camera.name})
   🖼️ Image: ${photo.img_src}`;
            }).join('\n\n');
            const summary = `🔴 **Mars Rover: ${rover.toUpperCase()}**

Found ${photos.length} photo(s)${photos.length > 10 ? ' (showing first 10)' : ''}:

${photoDescriptions}`;
            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: { photos },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Failed to fetch Mars Rover photos: ${message}` }],
                structuredContent: { photos: [] },
            };
        }
    });
}
