// -------------------------- calculate-launch-window.ts -------------------------
// MCP tool that calculates optimal launch windows based on multiple factors.
// Analyzes weather, space weather, natural events, and provides recommendations.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "calculate-launch-window",
    {
      title: "Calculate Launch Window",
      description: "Calculate optimal launch windows by analyzing weather conditions, space weather, nearby natural events, and environmental constraints for a specific launch site",
      inputSchema: z.object({
        location: z.string().describe("Launch site location (e.g., 'Kennedy Space Center', 'Cape Canaveral')"),
        latitude: z.number().describe("Launch site latitude"),
        longitude: z.number().describe("Launch site longitude"),
        targetDate: z.string().optional().describe("Target launch date in YYYY-MM-DD format (default: today)"),
        windowDays: z.number().optional().describe("Number of days to analyze for launch window (default: 7)")
      }).shape,
      outputSchema: z.object({
        location: z.string(),
        targetDate: z.string(),
        recommendation: z.string(),
        constraints: z.array(z.string()),
        optimalWindows: z.array(z.object({
          date: z.string(),
          score: z.number(),
          conditions: z.string()
        }))
      }).shape,
    },
    async ({ location, latitude, longitude, targetDate, windowDays = 7 }) => {
      try {
        const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
        const target = targetDate ? new Date(targetDate) : new Date();
        const targetStr = target.toISOString().split('T')[0];
        const endDate = new Date(target.getTime() + windowDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const startDate = new Date(target.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Parallel fetch all constraint data
        const results = await Promise.allSettled([
          // Fetch EONET events
          fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100`)
            .then(r => r.ok ? r.json() : { events: [] }),

          // Fetch space weather
          fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`)
            .then(r => r.ok ? r.json() : []),

          fetch(`https://api.nasa.gov/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`)
            .then(r => r.ok ? r.json() : []),

          fetch(`https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`)
            .then(r => r.ok ? r.json() : [])
        ]);

        // Parse results
        const eonetData = results[0].status === 'fulfilled' ? results[0].value : { events: [] };
        const solarFlares = results[1].status === 'fulfilled' ? results[1].value : [];
        const geoStorms = results[2].status === 'fulfilled' ? results[2].value : [];
        const cmes = results[3].status === 'fulfilled' ? results[3].value : [];

        // Filter nearby natural events (within 300km)
        const nearbyEvents = (eonetData.events || []).filter((event: any) => {
          const geometry = event.geometry?.[event.geometry.length - 1];
          if (!geometry?.coordinates) return false;
          const [eventLon, eventLat] = geometry.coordinates;
          const distance = calculateDistance(latitude, longitude, eventLat, eventLon);
          return distance <= 300;
        }).map((event: any) => {
          const geometry = event.geometry?.[event.geometry.length - 1];
          return {
            title: event.title,
            category: event.categories?.[0]?.title,
            date: geometry.date,
            distance: Math.round(calculateDistance(latitude, longitude, geometry.coordinates[1], geometry.coordinates[0]))
          };
        });

        // Analyze each day in the window
        const dailyScores: Array<{ date: string; score: number; constraints: string[]; details: string }> = [];

        for (let i = 0; i < windowDays; i++) {
          const checkDate = new Date(target.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = checkDate.toISOString().split('T')[0];

          let score = 100; // Start with perfect score
          const constraints: string[] = [];

          // Check for nearby severe weather events on this date
          const dayEvents = nearbyEvents.filter((e: any) => {
            const eventDate = new Date(e.date);
            const dayDiff = Math.abs((checkDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
            return dayDiff <= 1; // Within 1 day
          });

          dayEvents.forEach((event: any) => {
            if (['Wildfires', 'Severe Storms', 'Volcanoes'].includes(event.category)) {
              score -= 30;
              constraints.push(`${event.category}: ${event.title} (${event.distance}km)`);
            } else {
              score -= 10;
              constraints.push(`${event.category}: ${event.title} (${event.distance}km)`);
            }
          });

          // Check for space weather on this date
          const dayFlares = solarFlares.filter((flare: any) => {
            const flareDate = new Date(flare.beginTime || flare.peakTime).toISOString().split('T')[0];
            return flareDate === dateStr;
          });

          dayFlares.forEach((flare: any) => {
            if (flare.classType?.startsWith('X')) {
              score -= 40;
              constraints.push(`Extreme solar flare (${flare.classType})`);
            } else if (flare.classType?.startsWith('M')) {
              score -= 20;
              constraints.push(`Major solar flare (${flare.classType})`);
            } else {
              score -= 5;
              constraints.push(`Solar flare (${flare.classType})`);
            }
          });

          const dayStorms = geoStorms.filter((storm: any) => {
            const stormDate = new Date(storm.startTime).toISOString().split('T')[0];
            return stormDate === dateStr;
          });

          dayStorms.forEach((storm: any) => {
            const kp = storm.allKpIndex?.[0]?.kpIndex || 0;
            if (kp >= 7) {
              score -= 35;
              constraints.push(`Severe geomagnetic storm (Kp ${kp})`);
            } else if (kp >= 5) {
              score -= 20;
              constraints.push(`Moderate geomagnetic storm (Kp ${kp})`);
            } else {
              score -= 5;
              constraints.push(`Minor geomagnetic storm (Kp ${kp})`);
            }
          });

          // Check for CMEs that might affect this date
          const dayCMEs = cmes.filter((cme: any) => {
            const cmeDate = new Date(cme.startTime);
            const arrivalDate = new Date(cmeDate.getTime() + 2 * 24 * 60 * 60 * 1000); // Assume 2-day transit
            const checkTime = checkDate.getTime();
            return checkTime >= cmeDate.getTime() && checkTime <= arrivalDate.getTime();
          });

          if (dayCMEs.length > 0) {
            score -= 15 * dayCMEs.length;
            constraints.push(`${dayCMEs.length} CME(s) potentially impacting`);
          }

          // Ensure score doesn't go below 0
          score = Math.max(0, score);

          let condition = '';
          if (score >= 90) condition = '✅ EXCELLENT';
          else if (score >= 75) condition = '🟢 GOOD';
          else if (score >= 60) condition = '🟡 FAIR';
          else if (score >= 40) condition = '🟠 MARGINAL';
          else condition = '🔴 POOR';

          dailyScores.push({
            date: dateStr,
            score,
            constraints,
            details: condition
          });
        }

        // Sort by score descending to find optimal windows
        const sortedScores = [...dailyScores].sort((a, b) => b.score - a.score);
        const optimalWindows = sortedScores.slice(0, 3);

        // Generate overall recommendation
        const bestScore = sortedScores[0].score;
        let recommendation = '';
        let overallConstraints: string[] = [];

        if (bestScore >= 90) {
          recommendation = `✅ **LAUNCH GO** - Excellent conditions expected. No significant constraints detected during the ${windowDays}-day window.`;
        } else if (bestScore >= 75) {
          recommendation = `🟢 **LAUNCH FAVORABLE** - Good conditions with minor constraints. Proceed with standard monitoring protocols.`;
        } else if (bestScore >= 60) {
          recommendation = `🟡 **CAUTION** - Fair conditions with notable constraints. Enhanced monitoring recommended.`;
        } else if (bestScore >= 40) {
          recommendation = `🟠 **CONSIDER DELAY** - Marginal conditions with significant constraints. Consider postponing or implementing additional safety measures.`;
        } else {
          recommendation = `🔴 **NO-GO** - Poor conditions with severe constraints. Delay launch until conditions improve.`;
        }

        // Collect all unique constraints
        const allConstraints = new Set<string>();
        dailyScores.forEach(day => day.constraints.forEach(c => allConstraints.add(c)));
        overallConstraints = Array.from(allConstraints);

        // Format output
        let summary = `🚀 **Launch Window Analysis**\n`;
        summary += `📍 **Location**: ${location} (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)\n`;
        summary += `🗓️ **Target Date**: ${targetStr}\n`;
        summary += `⏱️ **Analysis Window**: ${windowDays} days\n\n`;
        summary += `${recommendation}\n\n`;

        // Show optimal windows
        summary += `🎯 **Optimal Launch Windows**:\n`;
        optimalWindows.forEach((window, i) => {
          const windowDate = new Date(window.date);
          summary += `   ${i + 1}. **${windowDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}** - Score: ${window.score}/100 ${window.details}\n`;
          if (window.constraints.length > 0) {
            summary += `      Constraints: ${window.constraints.join(', ')}\n`;
          } else {
            summary += `      No constraints detected ✨\n`;
          }
        });
        summary += '\n';

        // Show all days
        summary += `📅 **Daily Scores** (all ${windowDays} days):\n`;
        dailyScores.forEach((day, i) => {
          const dayDate = new Date(day.date);
          const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          summary += `   ${dayName}: ${day.score}/100 ${day.details}\n`;
        });
        summary += '\n';

        // Show overall constraints if any
        if (overallConstraints.length > 0) {
          summary += `⚠️ **Constraints Identified** (during ${windowDays}-day period):\n`;
          overallConstraints.forEach(constraint => summary += `   • ${constraint}\n`);
        } else {
          summary += `✨ **No constraints detected during analysis period**\n`;
        }

        return {
          content: [{ type: 'text', text: summary }],
          structuredContent: {
            location,
            coordinates: { latitude, longitude },
            targetDate: targetStr,
            windowDays,
            recommendation,
            bestScore,
            constraints: overallConstraints,
            optimalWindows: optimalWindows.map(w => ({
              date: w.date,
              score: w.score,
              conditions: w.details,
              constraints: w.constraints
            })),
            dailyScores
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Failed to calculate launch window: ${message}` }],
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
