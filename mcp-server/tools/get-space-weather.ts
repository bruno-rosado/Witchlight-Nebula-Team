// -------------------------- get-space-weather.ts -------------------------
// MCP tool that fetches space weather events from NASA's DONKI API.
// Returns information about solar flares, CMEs, geomagnetic storms, etc.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "get-space-weather",
    {
      title: "Get Space Weather Events",
      description: "Fetch space weather events from NASA's DONKI (Space Weather Database Of Notifications, Knowledge, Information) including solar flares, CMEs, and geomagnetic storms",
      inputSchema: z.object({
        type: z.enum(["FLR", "CME", "GST", "IPS", "MPC", "RBE", "SEP", "all"]).optional()
          .describe("Event type: FLR=Solar Flare, CME=Coronal Mass Ejection, GST=Geomagnetic Storm, all=All types (default: all)"),
        startDate: z.string().optional().describe("Start date in YYYY-MM-DD format (default: 30 days ago)"),
        endDate: z.string().optional().describe("End date in YYYY-MM-DD format (default: today)")
      }).shape,
      outputSchema: z.object({
        events: z.array(z.object({
          type: z.string(),
          date: z.string(),
          details: z.string()
        }))
      }).shape,
    },
    async ({ type = "all", startDate, endDate }) => {
      try {
        const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

        // Default to last 30 days if no dates provided
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let events: any[] = [];

        // Fetch different event types
        const eventTypes = type === "all"
          ? ["FLR", "CME", "GST"]
          : [type];

        for (const eventType of eventTypes) {
          try {
            let url = `https://api.nasa.gov/DONKI/${eventType}?startDate=${start}&endDate=${end}&api_key=${apiKey}`;

            const resp = await fetch(url);
            if (!resp.ok) {
              console.warn(`DONKI ${eventType} API responded with ${resp.status}`);
              continue;
            }
            const data = await resp.json();

            // Format based on event type
            if (eventType === "FLR") {
              // Solar Flares
              events.push(...data.map((item: any) => ({
                type: "Solar Flare",
                date: item.beginTime || item.peakTime,
                classType: item.classType,
                sourceLocation: item.sourceLocation,
                details: `Class ${item.classType} solar flare from ${item.sourceLocation || 'unknown location'}`
              })));
            } else if (eventType === "CME") {
              // Coronal Mass Ejections
              events.push(...data.map((item: any) => ({
                type: "Coronal Mass Ejection",
                date: item.startTime || item.activityID,
                speed: item.speed,
                halfAngle: item.halfAngle,
                details: `CME with speed ${item.speed || 'unknown'} km/s${item.cmeAnalyses?.[0]?.isMostAccurate ? ' (most accurate analysis)' : ''}`
              })));
            } else if (eventType === "GST") {
              // Geomagnetic Storms
              events.push(...data.map((item: any) => ({
                type: "Geomagnetic Storm",
                date: item.startTime,
                kpIndex: item.allKpIndex?.[0]?.kpIndex,
                details: `Geomagnetic storm with Kp index ${item.allKpIndex?.[0]?.kpIndex || 'unknown'}${item.linkedEvents?.length ? ` (${item.linkedEvents.length} linked events)` : ''}`
              })));
            }
          } catch (err) {
            console.warn(`Failed to fetch ${eventType}:`, err);
          }
        }

        // Sort by date descending
        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (events.length === 0) {
          return {
            content: [{ type: 'text', text: `No space weather events found between ${start} and ${end}` }],
            structuredContent: { events: [] },
          };
        }

        // Format as human-readable text
        const eventDescriptions = events.map((event: any, index: number) => {
          let desc = `${index + 1}. **${event.type}**
   - Date: ${new Date(event.date).toLocaleString('en-US', {
     year: 'numeric', month: 'short', day: 'numeric',
     hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
   })} UTC
   - ${event.details}`;

          if (event.classType) desc += `\n   - Class: ${event.classType}`;
          if (event.speed) desc += `\n   - Speed: ${event.speed} km/s`;
          if (event.kpIndex) desc += `\n   - Kp Index: ${event.kpIndex}`;

          return desc;
        }).join('\n\n');

        const summary = `☀️ **Space Weather Report** (${start} to ${end})
Found ${events.length} space weather events:\n\n${eventDescriptions}

**Legend:**
- Solar Flares: Intense bursts of radiation (Classes: A, B, C, M, X from weakest to strongest)
- CMEs: Large expulsions of plasma and magnetic field from the Sun
- Geomagnetic Storms: Disturbances in Earth's magnetosphere (Kp index 0-9)`;

        return {
          content: [{ type: 'text', text: summary }],
          structuredContent: { events, count: events.length, dateRange: { start, end } },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Failed to fetch space weather data: ${message}` }],
          structuredContent: { events: [], error: message },
        };
      }
    }
  );
}
