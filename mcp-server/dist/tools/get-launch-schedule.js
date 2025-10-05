// -------------------------- get-launch-schedule.ts -------------------------
// MCP tool that fetches upcoming rocket launches from The Space Devs API.
// Returns detailed information about scheduled launches worldwide.
// --------------------------------------------------------------------
import { z } from "zod";
export function register(server) {
    server.registerTool("get-launch-schedule", {
        title: "Get Launch Schedule",
        description: "Fetch upcoming rocket launches worldwide from The Space Devs API. Includes NASA, SpaceX, and international launches with mission details, launch windows, and status.",
        inputSchema: z.object({
            limit: z.number().optional().describe("Number of launches to return (default: 10, max: 100)"),
            location: z.string().optional().describe("Filter by location name (e.g., 'Kennedy Space Center', 'Cape Canaveral', 'Vandenberg')"),
            agency: z.string().optional().describe("Filter by agency/provider (e.g., 'NASA', 'SpaceX', 'ULA', 'Roscosmos')"),
            status: z.enum(["Go", "TBD", "Success", "Failure", "Hold", "all"]).optional()
                .describe("Filter by launch status (default: all upcoming)")
        }).shape,
        outputSchema: z.object({
            launches: z.array(z.object({
                name: z.string(),
                date: z.string(),
                location: z.string(),
                agency: z.string(),
                mission: z.string(),
                status: z.string()
            }))
        }).shape,
    }, async ({ limit = 10, location, agency, status }) => {
        try {
            // Build The Space Devs API URL
            const params = new URLSearchParams({
                limit: String(Math.min(limit, 100)),
                mode: 'detailed'
            });
            if (location)
                params.append('location__name__icontains', location);
            if (agency)
                params.append('rocket__configuration__manufacturer__name__icontains', agency);
            if (status && status !== 'all')
                params.append('status__abbrev', status);
            const url = `https://ll.thespacedevs.com/2.2.0/launch/upcoming/?${params.toString()}`;
            // Fetch data from The Space Devs API
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`The Space Devs API responded with ${resp.status}`);
            }
            const data = await resp.json();
            const launches = (data.results || []).map((launch) => {
                const windowStart = new Date(launch.window_start || launch.net);
                const windowEnd = launch.window_end ? new Date(launch.window_end) : null;
                return {
                    id: launch.id,
                    name: launch.name,
                    date: launch.net || launch.window_start,
                    windowStart: launch.window_start,
                    windowEnd: launch.window_end,
                    location: launch.pad?.location?.name || 'Unknown',
                    padName: launch.pad?.name,
                    agency: launch.launch_service_provider?.name || 'Unknown',
                    rocket: launch.rocket?.configuration?.full_name || launch.rocket?.configuration?.name,
                    mission: launch.mission?.description || launch.mission?.name || 'No mission description',
                    missionType: launch.mission?.type || 'Unknown',
                    status: launch.status?.name || 'Unknown',
                    statusAbbrev: launch.status?.abbrev,
                    probability: launch.probability,
                    holdReason: launch.holdreason,
                    failReason: launch.failreason,
                    webcastLive: launch.webcast_live,
                    image: launch.image,
                    infographic: launch.infographic_url
                };
            });
            if (launches.length === 0) {
                const filters = [location && `location: ${location}`, agency && `agency: ${agency}`, status && `status: ${status}`]
                    .filter(Boolean).join(', ');
                return {
                    content: [{ type: 'text', text: `No launches found${filters ? ` with filters (${filters})` : ''}` }],
                    structuredContent: { launches: [] },
                };
            }
            // Format as human-readable text
            const launchDescriptions = launches.map((launch, index) => {
                const launchDate = new Date(launch.date);
                const now = new Date();
                const daysUntil = Math.ceil((launchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const timeUntil = daysUntil > 0 ? `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}` : 'soon';
                let desc = `${index + 1}. 🚀 **${launch.name}**
   - **Launch Date**: ${launchDate.toLocaleString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
                })} UTC (${timeUntil})
   - **Status**: ${launch.status}${launch.statusAbbrev ? ` (${launch.statusAbbrev})` : ''}`;
                if (launch.probability !== null && launch.probability !== undefined) {
                    desc += `\n   - **GO Probability**: ${launch.probability}%`;
                }
                desc += `\n   - **Location**: ${launch.padName || launch.location}`;
                desc += `\n   - **Agency**: ${launch.agency}`;
                desc += `\n   - **Rocket**: ${launch.rocket}`;
                if (launch.missionType && launch.missionType !== 'Unknown') {
                    desc += `\n   - **Mission Type**: ${launch.missionType}`;
                }
                if (launch.mission && launch.mission !== 'No mission description') {
                    const shortMission = launch.mission.length > 150
                        ? launch.mission.substring(0, 150) + '...'
                        : launch.mission;
                    desc += `\n   - **Mission**: ${shortMission}`;
                }
                if (launch.holdReason) {
                    desc += `\n   - ⚠️ **Hold Reason**: ${launch.holdReason}`;
                }
                if (launch.webcastLive) {
                    desc += `\n   - 📺 **Webcast**: Live`;
                }
                return desc;
            }).join('\n\n');
            const filterInfo = [location && `Location: ${location}`, agency && `Agency: ${agency}`, status && status !== 'all' && `Status: ${status}`]
                .filter(Boolean).join(' | ');
            const summary = `🚀 **Upcoming Launch Schedule**${filterInfo ? `\n📍 Filters: ${filterInfo}` : ''}
\nFound ${launches.length} launch${launches.length !== 1 ? 'es' : ''}:\n\n${launchDescriptions}

**Status Legend:**
- Go: Launch is scheduled and cleared
- TBD: To Be Determined
- Hold: Launch is on hold
- Success/Failure: Past launch results`;
            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: {
                    launches,
                    count: launches.length,
                    filters: { location, agency, status }
                },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Failed to fetch launch schedule: ${message}` }],
                structuredContent: { launches: [], error: message },
            };
        }
    });
}
