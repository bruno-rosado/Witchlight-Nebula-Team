// -------------------------- correlate-mission-data.ts -------------------------
// MCP tool that correlates multiple NASA data sources for mission planning.
// Combines EONET events, weather, space weather, and launch data for a location.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "correlate-mission-data",
    {
      title: "Correlate Mission Data",
      description: "Analyze mission feasibility by correlating multiple data sources: natural events (EONET), weather conditions, space weather, and launch schedules for a specific location and timeframe",
      inputSchema: z.object({
        location: z.string().describe("Location name (e.g., 'Kennedy Space Center', 'Cape Canaveral', 'Vandenberg')"),
        latitude: z.number().optional().describe("Latitude for proximity analysis"),
        longitude: z.number().optional().describe("Longitude for proximity analysis"),
        radiusKm: z.number().optional().describe("Search radius in kilometers (default: 200)"),
        daysAhead: z.number().optional().describe("Number of days to analyze ahead (default: 7)")
      }).shape,
      outputSchema: z.object({
        location: z.string(),
        analysis: z.object({
          naturalEvents: z.array(z.any()),
          spaceWeather: z.array(z.any()),
          upcomingLaunches: z.array(z.any()),
          risks: z.array(z.string()),
          recommendation: z.string()
        })
      }).shape,
    },
    async ({ location, latitude, longitude, radiusKm = 200, daysAhead = 7 }) => {
      try {
        const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
        const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Parallel fetch all data sources
        const results = await Promise.allSettled([
          // Fetch EONET events
          fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50`)
            .then(r => r.ok ? r.json() : { events: [] }),

          // Fetch space weather
          fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`)
            .then(r => r.ok ? r.json() : []),

          fetch(`https://api.nasa.gov/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`)
            .then(r => r.ok ? r.json() : []),

          // Fetch upcoming launches
          fetch(`https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=20&location__name__icontains=${encodeURIComponent(location)}`)
            .then(r => r.ok ? r.json() : { results: [] })
        ]);

        // Parse results
        const eonetData = results[0].status === 'fulfilled' ? results[0].value : { events: [] };
        const solarFlares = results[1].status === 'fulfilled' ? results[1].value : [];
        const geoStorms = results[2].status === 'fulfilled' ? results[2].value : [];
        const launchData = results[3].status === 'fulfilled' ? results[3].value : { results: [] };

        // Filter EONET events by proximity if coordinates provided
        let nearbyEvents: any[] = [];
        if (latitude !== undefined && longitude !== undefined) {
          nearbyEvents = (eonetData.events || []).filter((event: any) => {
            const geometry = event.geometry?.[event.geometry.length - 1];
            if (!geometry?.coordinates) return false;

            const [eventLon, eventLat] = geometry.coordinates;
            const distance = calculateDistance(latitude, longitude, eventLat, eventLon);
            return distance <= radiusKm;
          }).map((event: any) => {
            const geometry = event.geometry?.[event.geometry.length - 1];
            const distance = calculateDistance(latitude!, longitude!, geometry.coordinates[1], geometry.coordinates[0]);
            return {
              title: event.title,
              category: event.categories?.[0]?.title,
              date: geometry.date,
              coordinates: geometry.coordinates,
              distanceKm: Math.round(distance)
            };
          });
        }

        // Analyze space weather
        const spaceWeatherEvents = [
          ...solarFlares.map((flare: any) => ({
            type: 'Solar Flare',
            date: flare.beginTime,
            severity: flare.classType,
            details: `Class ${flare.classType} flare`
          })),
          ...geoStorms.map((storm: any) => ({
            type: 'Geomagnetic Storm',
            date: storm.startTime,
            severity: storm.allKpIndex?.[0]?.kpIndex,
            details: `Kp index ${storm.allKpIndex?.[0]?.kpIndex || 'unknown'}`
          }))
        ];

        // Get upcoming launches
        const upcomingLaunches = (launchData.results || []).slice(0, 5).map((launch: any) => ({
          name: launch.name,
          date: launch.net,
          status: launch.status?.name,
          probability: launch.probability,
          location: launch.pad?.location?.name
        }));

        // Risk Assessment
        const risks: string[] = [];
        let riskLevel = 'LOW';

        // Check for nearby natural events
        if (nearbyEvents.length > 0) {
          const severeEvents = nearbyEvents.filter((e: any) =>
            ['Wildfires', 'Severe Storms', 'Volcanoes'].includes(e.category)
          );
          if (severeEvents.length > 0) {
            risks.push(`⚠️ ${severeEvents.length} severe natural event(s) within ${radiusKm}km`);
            riskLevel = 'HIGH';
          } else {
            risks.push(`ℹ️ ${nearbyEvents.length} natural event(s) within ${radiusKm}km`);
            riskLevel = 'MEDIUM';
          }
        }

        // Check for space weather
        const recentSpaceWeather = spaceWeatherEvents.filter((e: any) => {
          const eventDate = new Date(e.date);
          const now = new Date();
          const daysDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff >= -2 && daysDiff <= daysAhead;
        });

        const severeFlares = recentSpaceWeather.filter((e: any) =>
          e.type === 'Solar Flare' && (e.severity?.startsWith('M') || e.severity?.startsWith('X'))
        );

        if (severeFlares.length > 0) {
          risks.push(`☀️ ${severeFlares.length} M/X-class solar flare(s) detected`);
          if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
        }

        const severeStorms = recentSpaceWeather.filter((e: any) =>
          e.type === 'Geomagnetic Storm' && e.severity >= 5
        );

        if (severeStorms.length > 0) {
          risks.push(`🌍 ${severeStorms.length} severe geomagnetic storm(s) (Kp ≥ 5)`);
          riskLevel = 'HIGH';
        }

        // Generate recommendation
        let recommendation = '';
        if (riskLevel === 'LOW') {
          recommendation = '✅ CONDITIONS FAVORABLE - No significant environmental constraints detected. Proceed with mission planning.';
        } else if (riskLevel === 'MEDIUM') {
          recommendation = '⚠️ CAUTION ADVISED - Monitor conditions closely. Some environmental factors may impact operations.';
        } else {
          recommendation = '🛑 HIGH RISK - Significant environmental constraints detected. Consider delaying mission or implementing additional safety protocols.';
        }

        // Format output
        let summary = `📊 **Mission Correlation Analysis for ${location}**\n`;
        summary += `🗓️ Analysis Period: Next ${daysAhead} days\n`;
        if (latitude && longitude) {
          summary += `📍 Coordinates: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (${radiusKm}km radius)\n`;
        }
        summary += `\n**Risk Level: ${riskLevel}**\n`;
        summary += `${recommendation}\n\n`;

        // Natural Events
        if (nearbyEvents.length > 0) {
          summary += `🌍 **Nearby Natural Events** (${nearbyEvents.length}):\n`;
          nearbyEvents.slice(0, 5).forEach((event: any, i: number) => {
            summary += `   ${i + 1}. ${event.title} (${event.category}) - ${event.distanceKm}km away\n`;
          });
          summary += '\n';
        } else {
          summary += `🌍 **Natural Events**: None detected within ${radiusKm}km\n\n`;
        }

        // Space Weather
        if (recentSpaceWeather.length > 0) {
          summary += `☀️ **Space Weather Events** (${recentSpaceWeather.length}):\n`;
          recentSpaceWeather.slice(0, 5).forEach((event: any, i: number) => {
            const eventDate = new Date(event.date);
            summary += `   ${i + 1}. ${event.type}: ${event.details} - ${eventDate.toLocaleDateString()}\n`;
          });
          summary += '\n';
        } else {
          summary += `☀️ **Space Weather**: Nominal conditions\n\n`;
        }

        // Upcoming Launches
        if (upcomingLaunches.length > 0) {
          summary += `🚀 **Upcoming Launches** (${upcomingLaunches.length}):\n`;
          upcomingLaunches.forEach((launch: any, i: number) => {
            const launchDate = new Date(launch.date);
            summary += `   ${i + 1}. ${launch.name} - ${launchDate.toLocaleDateString()}`;
            if (launch.probability !== null && launch.probability !== undefined) {
              summary += ` (${launch.probability}% GO)`;
            }
            summary += '\n';
          });
          summary += '\n';
        } else {
          summary += `🚀 **Upcoming Launches**: None scheduled for this location\n\n`;
        }

        // Risk Summary
        if (risks.length > 0) {
          summary += `⚠️ **Risk Factors**:\n`;
          risks.forEach(risk => summary += `   • ${risk}\n`);
        }

        return {
          content: [{ type: 'text', text: summary }],
          structuredContent: {
            location,
            coordinates: latitude && longitude ? { latitude, longitude, radiusKm } : undefined,
            riskLevel,
            analysis: {
              naturalEvents: nearbyEvents,
              spaceWeather: recentSpaceWeather,
              upcomingLaunches,
              risks,
              recommendation
            }
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Failed to correlate mission data: ${message}` }],
          structuredContent: { error: message },
        };
      }
    }
  );
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
