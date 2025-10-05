// -------------------------- search-news.ts -------------------------
// MCP tool that searches Google News for space-related news articles.
// Uses SerpAPI to monitor launches, missions, policy changes, and alerts.
// --------------------------------------------------------------------
import { z } from "zod";
export function register(server) {
    server.registerTool("search-news", {
        title: "Search Google News",
        description: "Search Google News for space-related articles, launch updates, mission news, and alerts. Monitor competitor activity, policy changes, and breaking space news.",
        inputSchema: z.object({
            query: z.string().describe("News search query (e.g., 'SpaceX launch', 'NASA Mars mission', 'space weather alert')"),
            location: z.string().optional().describe("Location for localized news (e.g., 'United States', 'Florida')"),
            time_period: z.enum(["hour", "day", "week", "month", "year"]).optional()
                .describe("Filter news by time period (default: week)"),
            num_results: z.number().optional().describe("Number of results to return (default: 10, max: 20)")
        }).shape,
        outputSchema: z.object({
            news: z.array(z.object({
                title: z.string(),
                link: z.string(),
                source: z.string(),
                date: z.string(),
                snippet: z.string()
            }))
        }).shape,
    }, async ({ query, location, time_period = "week", num_results = 10 }) => {
        try {
            const apiKey = process.env.SERP_API_KEY;
            if (!apiKey) {
                throw new Error('SERP_API_KEY not configured in environment');
            }
            // Build SerpAPI URL for Google News
            const params = new URLSearchParams({
                engine: 'google_news',
                q: query,
                api_key: apiKey,
                num: String(Math.min(num_results, 20))
            });
            if (location)
                params.append('gl', location);
            // Map time period to SerpAPI parameter
            const timeMap = {
                hour: 'qdr:h',
                day: 'qdr:d',
                week: 'qdr:w',
                month: 'qdr:m',
                year: 'qdr:y'
            };
            if (time_period && timeMap[time_period]) {
                params.append('tbs', timeMap[time_period]);
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
            // Parse news results
            const news = (data.news_results || []).map((item) => ({
                title: item.title,
                link: item.link,
                source: item.source?.name || 'Unknown',
                date: item.date,
                snippet: item.snippet || 'No preview available',
                thumbnail: item.thumbnail
            }));
            if (news.length === 0) {
                return {
                    content: [{ type: 'text', text: `No news articles found for: "${query}"` }],
                    structuredContent: { news: [] },
                };
            }
            // Format as human-readable text
            const newsDescriptions = news.map((article, index) => {
                let desc = `${index + 1}. **${article.title}**\n   ${article.snippet}`;
                desc += `\n   📰 **Source**: ${article.source}`;
                desc += `\n   📅 **Date**: ${article.date}`;
                desc += `\n   🔗 **Link**: ${article.link}`;
                return desc;
            }).join('\n\n');
            const timePeriodText = time_period ? ` (past ${time_period})` : '';
            const locationText = location ? ` in ${location}` : '';
            const summary = `📰 **Google News Results**${timePeriodText}${locationText}
Query: "${query}"
Found ${news.length} news article${news.length !== 1 ? 's' : ''}:\n\n${newsDescriptions}`;
            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: {
                    query,
                    filters: { location, time_period },
                    news,
                    count: news.length
                },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Failed to search Google News: ${message}` }],
                structuredContent: { news: [], error: message },
            };
        }
    });
}
