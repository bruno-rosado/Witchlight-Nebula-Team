// -------------------------- search-trends.ts -------------------------
// MCP tool that searches Google Trends for topic interest over time.
// Uses SerpAPI to analyze public interest in space missions and topics.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "search-trends",
    {
      title: "Search Google Trends",
      description: "Analyze Google Trends data to track public interest in space topics, missions, and events. Useful for gauging mission visibility, educational outreach impact, and trending space topics.",
      inputSchema: z.object({
        query: z.string().describe("Search term or topic (e.g., 'Mars mission', 'SpaceX launch', 'James Webb Telescope')"),
        date: z.string().optional().describe("Date range (e.g., 'now 7-d', 'today 1-m', 'today 12-m', 'today 5-y', 'all')"),
        geo: z.string().optional().describe("Geographic location (e.g., 'US', 'US-CA', 'worldwide')"),
        compare: z.array(z.string()).optional().describe("Additional terms to compare (max 4 additional terms)")
      }).shape,
      outputSchema: z.object({
        interest_over_time: z.array(z.object({
          date: z.string(),
          value: z.number()
        })),
        related_queries: z.array(z.string())
      }).shape,
    },
    async ({ query, date = "today 12-m", geo = "US", compare = [] }) => {
      try {
        const apiKey = process.env.SERP_API_KEY;
        if (!apiKey) {
          throw new Error('SERP_API_KEY not configured in environment');
        }

        // Build search terms (main query + comparisons)
        const allTerms = [query, ...compare.slice(0, 4)]; // Max 5 total terms
        const searchTerm = allTerms.join(',');

        // Build SerpAPI URL for Google Trends
        const params = new URLSearchParams({
          engine: 'google_trends',
          q: searchTerm,
          data_type: 'TIMESERIES',
          date: date,
          api_key: apiKey
        });

        if (geo && geo !== 'worldwide') {
          params.append('geo', geo);
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

        // Parse interest over time
        const interestData = data.interest_over_time?.timeline_data || [];

        // Get related queries if available
        const relatedQueries = (data.related_queries?.top || [])
          .map((item: any) => item.query)
          .slice(0, 10);

        if (interestData.length === 0) {
          return {
            content: [{ type: 'text', text: `No trend data found for: "${query}"` }],
            structuredContent: { interest_over_time: [], related_queries: [] },
          };
        }

        // Calculate statistics
        const values = interestData.map((item: any) => {
          const termValues = item.values || [];
          return termValues[0]?.value || 0;
        });

        const avgInterest = values.length > 0
          ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length)
          : 0;
        const maxInterest = values.length > 0 ? Math.max(...values) : 0;
        const minInterest = values.length > 0 ? Math.min(...values) : 0;

        // Find peak period
        const peakIndex = values.indexOf(maxInterest);
        const peakPeriod = peakIndex >= 0 ? interestData[peakIndex]?.date : 'Unknown';

        // Format timeline for display
        const recentData = interestData.slice(-10); // Show last 10 data points
        const timelineText = recentData.map((item: any) => {
          const date = item.date;
          const value = item.values?.[0]?.value || 0;
          const bar = '█'.repeat(Math.round(value / 5)); // Visual bar
          return `   ${date}: ${bar} ${value}`;
        }).join('\n');

        // Format summary
        const geoText = geo === 'US' ? 'United States' : geo === 'worldwide' ? 'Worldwide' : geo;
        const dateRangeText = date.replace('today', 'past').replace('-d', ' days').replace('-m', ' months').replace('-y', ' years');

        let summary = `📈 **Google Trends Analysis**
Query: "${query}"`;

        if (compare.length > 0) {
          summary += `\nComparing with: ${compare.join(', ')}`;
        }

        summary += `\nLocation: ${geoText}
Time Range: ${dateRangeText}

**Statistics**:
   • Average Interest: ${avgInterest}/100
   • Peak Interest: ${maxInterest}/100 (${peakPeriod})
   • Minimum Interest: ${minInterest}/100

**Recent Trend** (last 10 periods):
${timelineText}`;

        if (relatedQueries.length > 0) {
          summary += `\n\n**Related Queries** (trending):`;
          relatedQueries.forEach((q: string, i: number) => {
            summary += `\n   ${i + 1}. ${q}`;
          });
        }

        return {
          content: [{ type: 'text', text: summary }],
          structuredContent: {
            query,
            compare,
            geo,
            date_range: date,
            statistics: {
              average: avgInterest,
              peak: maxInterest,
              minimum: minInterest,
              peak_period: peakPeriod
            },
            interest_over_time: interestData.map((item: any) => ({
              date: item.date,
              value: item.values?.[0]?.value || 0
            })),
            related_queries: relatedQueries
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Failed to search Google Trends: ${message}` }],
          structuredContent: { interest_over_time: [], related_queries: [], error: message },
        };
      }
    }
  );
}
