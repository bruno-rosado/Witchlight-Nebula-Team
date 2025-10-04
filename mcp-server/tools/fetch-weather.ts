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
      description: "Get weather data for a city",
      inputSchema: z.object({ city: z.string() }).shape,
      outputSchema: z.object({
        temperature: z.number(),
        conditions: z.string(),
      }).shape,
    },
    async ({ city }) => {
      // NOTE: Replace this placeholder URL with a real weather API endpoint and API key.
      // Example providers: OpenWeatherMap, WeatherAPI, Meteostat, etc.
      const safeCity = encodeURIComponent(city);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current_weather=true&timezone=UTC&city=${safeCity}`;

      // Use global fetch (Node 18+). Wrap in try/catch to return a helpful error as tool output.
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          throw new Error(`Weather API responded with ${resp.status}`);
        }
        const data = await resp.json();

        // best-effort mapping: many public APIs differ; adapt to your chosen API.
        const output = {
          temperature: Number(
            data?.current_weather?.temperature ?? data?.temp ?? 0
          ),
          conditions: String(
            data?.current_weather?.weathercode ?? data?.conditions ?? "unknown"
          ),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
          structuredContent: output,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Weather fetch failed: ${message}` }],
          structuredContent: {
            temperature: 0,
            conditions: `error: ${message}`,
          },
        };
      }
    }
  );
}
