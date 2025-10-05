// -------------------------- search-scholar.ts -------------------------
// MCP tool that searches Google Scholar for academic papers and research.
// Uses SerpAPI to find NASA research, citations, and scientific publications.
// --------------------------------------------------------------------

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.registerTool(
    "search-scholar",
    {
      title: "Search Google Scholar",
      description: "Search Google Scholar for academic papers, research articles, and citations. Useful for finding NASA research, mission studies, and scientific publications.",
      inputSchema: z.object({
        query: z.string().describe("Search query (e.g., 'Mars rover navigation', 'NASA climate research')"),
        year_low: z.number().optional().describe("Filter results from this year onwards (e.g., 2020)"),
        year_high: z.number().optional().describe("Filter results up to this year (e.g., 2024)"),
        num_results: z.number().optional().describe("Number of results to return (default: 10, max: 20)")
      }).shape,
      outputSchema: z.object({
        results: z.array(z.object({
          title: z.string(),
          link: z.string(),
          snippet: z.string(),
          authors: z.string().optional(),
          publication: z.string().optional(),
          cited_by: z.number().optional()
        }))
      }).shape,
    },
    async ({ query, year_low, year_high, num_results = 10 }) => {
      try {
        const apiKey = process.env.SERP_API_KEY;
        if (!apiKey) {
          throw new Error('SERP_API_KEY not configured in environment');
        }

        // Build SerpAPI URL for Google Scholar
        const params = new URLSearchParams({
          engine: 'google_scholar',
          q: query,
          api_key: apiKey,
          num: String(Math.min(num_results, 20))
        });

        if (year_low) params.append('as_ylo', String(year_low));
        if (year_high) params.append('as_yhi', String(year_high));

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

        // Parse organic results
        const results = (data.organic_results || []).map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet || item.publication_info?.summary || 'No description available',
          authors: item.publication_info?.authors?.map((a: any) => a.name).join(', '),
          publication: item.publication_info?.summary,
          year: item.publication_info?.year,
          cited_by: item.inline_links?.cited_by?.total,
          related_link: item.inline_links?.related_pages_link,
          pdf_link: item.resources?.find((r: any) => r.file_format === 'PDF')?.link
        }));

        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: `No scholarly articles found for: "${query}"` }],
            structuredContent: { results: [] },
          };
        }

        // Format as human-readable text
        const resultDescriptions = results.map((result: any, index: number) => {
          let desc = `${index + 1}. **${result.title}**\n   ${result.snippet}`;

          if (result.authors) {
            desc += `\n   📝 **Authors**: ${result.authors}`;
          }

          if (result.year) {
            desc += `\n   📅 **Year**: ${result.year}`;
          }

          if (result.cited_by) {
            desc += `\n   📊 **Cited by**: ${result.cited_by}`;
          }

          desc += `\n   🔗 **Link**: ${result.link}`;

          if (result.pdf_link) {
            desc += `\n   📄 **PDF**: ${result.pdf_link}`;
          }

          return desc;
        }).join('\n\n');

        const yearFilter = year_low || year_high
          ? ` (${year_low || 'any'} - ${year_high || 'present'})`
          : '';

        const summary = `📚 **Google Scholar Results**${yearFilter}
Query: "${query}"
Found ${results.length} scholarly article${results.length !== 1 ? 's' : ''}:\n\n${resultDescriptions}`;

        return {
          content: [{ type: 'text', text: summary }],
          structuredContent: {
            query,
            filters: { year_low, year_high },
            results,
            count: results.length
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Failed to search Google Scholar: ${message}` }],
          structuredContent: { results: [], error: message },
        };
      }
    }
  );
}
