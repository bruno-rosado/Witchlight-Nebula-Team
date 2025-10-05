// -------------------------- get-apod.ts -------------------------
// MCP tool that fetches NASA's Astronomy Picture of the Day (APOD).
// Returns the daily featured space image or video with explanation.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "get-apod",
    {
      title: "Get Astronomy Picture of the Day",
      description: "Fetch NASA's Astronomy Picture of the Day (APOD) - a stunning space image or video with description",
      inputSchema: z.object({
        date: z.string().optional().describe("Date in YYYY-MM-DD format (default: today)"),
        count: z.number().optional().describe("Number of random APODs to return (cannot use with date)")
      }).shape,
      outputSchema: z.object({
        title: z.string(),
        date: z.string(),
        explanation: z.string(),
        url: z.string(),
        hdurl: z.string().optional(),
        media_type: z.string(),
        copyright: z.string().optional()
      }).shape,
    },
    async ({ date, count }) => {
      try {
        const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

        // Build the APOD API URL
        const params = new URLSearchParams({ api_key: apiKey });
        if (date) params.append('date', date);
        if (count) params.append('count', String(count));

        const url = `https://api.nasa.gov/planetary/apod?${params.toString()}`;

        // Fetch data from APOD API
        const resp = await fetch(url);
        if (!resp.ok) {
          throw new Error(`NASA APOD API responded with ${resp.status}`);
        }
        const data = await resp.json();

        // Handle multiple results (count parameter)
        if (Array.isArray(data)) {
          const summaries = data.map((item: any, index: number) => {
            let desc = `**${index + 1}. ${item.title}** (${item.date})
   ${item.explanation.substring(0, 200)}...

   🖼️ **Media**: ${item.media_type === 'image' ? 'Image' : 'Video'}
   🔗 **View**: ${item.url}`;

            if (item.copyright) {
              desc += `\n   📷 **Copyright**: ${item.copyright}`;
            }

            return desc;
          }).join('\n\n---\n\n');

          return {
            content: [{ type: 'text', text: `🌌 **${data.length} Astronomy Pictures**\n\n${summaries}` }],
            structuredContent: { items: data },
          };
        }

        // Handle single result
        let summary = `🌌 **${data.title}**\n\n📅 **Date**: ${data.date}\n\n📖 **Explanation**:\n${data.explanation}\n\n`;

        if (data.media_type === 'image') {
          summary += `🖼️ **Image URL**: ${data.url}\n`;
          if (data.hdurl) {
            summary += `🖼️ **HD Image**: ${data.hdurl}\n`;
          }
        } else {
          summary += `🎥 **Video URL**: ${data.url}\n`;
        }

        if (data.copyright) {
          summary += `\n📷 **Copyright**: ${data.copyright}`;
        }

        return {
          content: [{ type: 'text', text: summary }],
          structuredContent: data,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Failed to fetch APOD: ${message}` }],
          structuredContent: { error: message },
        };
      }
    }
  );
}
