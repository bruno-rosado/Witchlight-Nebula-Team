// -------------------------- get-near-earth-objects.ts -------------------------
// MCP tool that fetches Near Earth Objects (asteroids) data from NASA NeoWs API.
// Returns asteroids approaching Earth with size, velocity, and miss distance.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "get-near-earth-objects",
    {
      title: "Get Near Earth Objects",
      description: "Fetch Near Earth Objects (asteroids) approaching Earth from NASA's NeoWs API with size, velocity, and miss distance data",
      inputSchema: z.object({
        start_date: z.string().optional().describe("Start date in YYYY-MM-DD format (default: today)"),
        end_date: z.string().optional().describe("End date in YYYY-MM-DD format (default: today, max 7 days from start)"),
        detailed: z.boolean().optional().describe("Include detailed orbital data (default: false)")
      }).shape,
      outputSchema: z.object({
        element_count: z.number(),
        asteroids: z.array(z.object({
          id: z.string(),
          name: z.string(),
          nasa_jpl_url: z.string(),
          absolute_magnitude: z.number(),
          estimated_diameter_km_min: z.number(),
          estimated_diameter_km_max: z.number(),
          is_potentially_hazardous: z.boolean(),
          close_approach_date: z.string(),
          relative_velocity_kmh: z.string(),
          miss_distance_km: z.string(),
          miss_distance_lunar: z.string()
        }))
      }).shape,
    },
    async ({ start_date, end_date, detailed = false }) => {
      try {
        const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

        // Default to today if no dates provided
        const today = new Date().toISOString().split('T')[0];
        const startDate = start_date || today;
        const endDate = end_date || today;

        // Build the NeoWs API URL
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          api_key: apiKey,
          detailed: String(detailed)
        });
        const url = `https://api.nasa.gov/neo/rest/v1/feed?${params.toString()}`;

        // Fetch data from NeoWs API
        const resp = await fetch(url);
        if (!resp.ok) {
          throw new Error(`NASA NeoWs API responded with ${resp.status}`);
        }
        const data = await resp.json();

        // Parse and format the near earth objects
        const asteroids: any[] = [];
        const neoData = data.near_earth_objects || {};

        for (const date in neoData) {
          const dateAsteroids = neoData[date] || [];
          dateAsteroids.forEach((neo: any) => {
            const closeApproach = neo.close_approach_data?.[0] || {};
            asteroids.push({
              id: neo.id,
              name: neo.name,
              nasa_jpl_url: neo.nasa_jpl_url,
              absolute_magnitude: neo.absolute_magnitude_h,
              estimated_diameter_km_min: neo.estimated_diameter?.kilometers?.estimated_diameter_min || 0,
              estimated_diameter_km_max: neo.estimated_diameter?.kilometers?.estimated_diameter_max || 0,
              is_potentially_hazardous: neo.is_potentially_hazardous_asteroid,
              close_approach_date: closeApproach.close_approach_date_full || date,
              relative_velocity_kmh: closeApproach.relative_velocity?.kilometers_per_hour || 'N/A',
              miss_distance_km: closeApproach.miss_distance?.kilometers || 'N/A',
              miss_distance_lunar: closeApproach.miss_distance?.lunar || 'N/A'
            });
          });
        }

        // Sort by closest approach
        asteroids.sort((a, b) => {
          const distA = parseFloat(a.miss_distance_km) || Infinity;
          const distB = parseFloat(b.miss_distance_km) || Infinity;
          return distA - distB;
        });

        // Format as human-readable text
        const hazardousCount = asteroids.filter(a => a.is_potentially_hazardous).length;
        let summary = `☄️ **Near Earth Objects Report**\n\n`;
        summary += `📅 **Date Range**: ${startDate} to ${endDate}\n`;
        summary += `🔢 **Total Asteroids**: ${data.element_count}\n`;
        summary += `⚠️ **Potentially Hazardous**: ${hazardousCount}\n\n`;

        if (asteroids.length === 0) {
          summary += `No asteroids found for this date range.`;
        } else {
          summary += `**Top ${Math.min(10, asteroids.length)} Closest Approaches:**\n\n`;

          const descriptions = asteroids.slice(0, 10).map((asteroid, index) => {
            const hazardIcon = asteroid.is_potentially_hazardous ? '⚠️ HAZARDOUS' : '✅ Safe';
            const diameterAvg = ((asteroid.estimated_diameter_km_min + asteroid.estimated_diameter_km_max) / 2).toFixed(3);
            const velocity = parseFloat(asteroid.relative_velocity_kmh).toFixed(0);
            const missDistKm = parseFloat(asteroid.miss_distance_km).toFixed(0);
            const missDistLunar = parseFloat(asteroid.miss_distance_lunar).toFixed(2);

            return `${index + 1}. **${asteroid.name}** ${hazardIcon}
   📏 Diameter: ~${diameterAvg} km
   🚀 Velocity: ${velocity} km/h
   📍 Miss Distance: ${missDistKm} km (${missDistLunar} lunar distances)
   📅 Closest Approach: ${asteroid.close_approach_date}
   🔗 More Info: ${asteroid.nasa_jpl_url}`;
          }).join('\n\n');

          summary += descriptions;
        }

        return {
          content: [{ type: 'text', text: summary }],
          structuredContent: { element_count: data.element_count, asteroids },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Failed to fetch Near Earth Objects: ${message}` }],
          structuredContent: { element_count: 0, asteroids: [] },
        };
      }
    }
  );
}
