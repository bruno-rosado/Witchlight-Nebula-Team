// -------------------------- fetch-weather.ts -------------------------
// A simple MCP tool that fetches weather data from an external API.
// It returns both text content and structured output matching the declared schema.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "fetch-weather",
    {
      title: "Weather Fetcher",
      description: "Get weather data for a city and date",
      inputSchema: z.object({ city: z.string() }).shape,
      outputSchema: z.object({
        temperature: z.number(),
        conditions: z.string(),
      }).shape,
    },
    async ({ city }) => {
      const apiKey = process.env.SERP_API_KEY;
      if (!apiKey) {
        const msg = 'SERP_API_KEY not set in server environment';
        return {
          content: [{ type: 'text', text: `Weather fetch failed: ${msg}` }],
          structuredContent: { temperature: 0, conditions: `error: ${msg}` },
        };
      }

      const safeCity = String(city || '').trim();
      if (!safeCity) {
        const msg = 'Missing city';
        return {
          content: [{ type: 'text', text: `Weather fetch failed: ${msg}` }],
          structuredContent: { temperature: 0, conditions: `error: ${msg}` },
        };
      }

      const params = new URLSearchParams({
        q: `weather at ${safeCity}`,
        engine: 'google',
        api_key: apiKey,
      });
      const url = `https://serpapi.com/search.json?${params.toString()}`;

      function findFirst(obj: any, predicate: (k: string, v: any) => boolean): any {
        if (!obj || typeof obj !== 'object') return undefined;
        for (const [k, v] of Object.entries(obj)) {
          try {
            if (predicate(k, v)) return v;
          } catch (_e) {}
          const nested = findFirst(v, predicate);
          if (nested !== undefined) return nested;
        }
        return undefined;
      }

      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`SerpAPI responded with ${resp.status}`);
        const data = await resp.json();

        // Heuristics for temperature
        const tempCandidate = findFirst(data, (k, v) => {
          const key = String(k).toLowerCase();
          return (
            (key.includes('temp') || key.includes('temperature')) && (typeof v === 'number' || !Number.isNaN(Number(v)))
          );
        });
        let temperature = 0;
        if (typeof tempCandidate === 'number') temperature = tempCandidate;
        else if (tempCandidate !== undefined) temperature = Number(tempCandidate) || 0;

        // Heuristics for conditions
        const condCandidate = findFirst(data, (k, v) => {
          const key = String(k).toLowerCase();
          return (
            (key.includes('condition') || key.includes('conditions') || key.includes('description') || key.includes('weather') || key.includes('text'))
            && (typeof v === 'string')
          );
        });
        const conditions = condCandidate ? String(condCandidate) : JSON.stringify(data?.weather ?? data?.current_weather ?? 'unknown');

        const output = { temperature, conditions };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Weather fetch failed: ${message}` }],
          structuredContent: { temperature: 0, conditions: `error: ${message}` },
        };
      }
    }
  );
}