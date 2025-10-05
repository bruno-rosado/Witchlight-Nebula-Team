// -------------------------- search-flights.ts -------------------------
// MCP tool that searches Google Flights for flight options.
// Uses SerpAPI to coordinate crew travel and mission logistics.
// --------------------------------------------------------------------
import { z } from "zod";
export function register(server) {
    server.registerTool("search-flights", {
        title: "Search Flights",
        description: "Search Google Flights for flight options between cities. Useful for coordinating crew travel, mission logistics, and emergency response planning.",
        inputSchema: z.object({
            departure: z.string().describe("Departure airport code or city (e.g., 'LAX', 'Los Angeles', 'Houston')"),
            arrival: z.string().describe("Arrival airport code or city (e.g., 'MCO', 'Orlando', 'Kennedy Space Center')"),
            outbound_date: z.string().describe("Departure date in YYYY-MM-DD format"),
            return_date: z.string().optional().describe("Return date in YYYY-MM-DD format (omit for one-way)"),
            adults: z.number().optional().describe("Number of adult passengers (default: 1)"),
            travel_class: z.enum(["economy", "premium_economy", "business", "first"]).optional()
                .describe("Travel class (default: economy)")
        }).shape,
        outputSchema: z.object({
            flights: z.array(z.object({
                airline: z.string(),
                departure_time: z.string(),
                arrival_time: z.string(),
                duration: z.string(),
                price: z.number(),
                stops: z.number()
            }))
        }).shape,
    }, async ({ departure, arrival, outbound_date, return_date, adults = 1, travel_class = "economy" }) => {
        try {
            const apiKey = process.env.SERP_API_KEY;
            if (!apiKey) {
                throw new Error('SERP_API_KEY not configured in environment');
            }
            // Build SerpAPI URL for Google Flights
            const params = new URLSearchParams({
                engine: 'google_flights',
                departure_id: departure,
                arrival_id: arrival,
                outbound_date: outbound_date,
                api_key: apiKey,
                adults: String(adults),
                type: return_date ? '1' : '2', // 1 = round trip, 2 = one way
                travel_class: String(travel_class === 'economy' ? 1 : travel_class === 'premium_economy' ? 2 : travel_class === 'business' ? 3 : 4)
            });
            if (return_date) {
                params.append('return_date', return_date);
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
            // Parse flight results (best flights)
            const flights = (data.best_flights || []).concat(data.other_flights || []).map((item) => {
                const firstFlight = item.flights?.[0];
                const lastFlight = item.flights?.[item.flights.length - 1];
                return {
                    price: item.price,
                    airline: firstFlight?.airline,
                    airline_logo: firstFlight?.airline_logo,
                    flight_number: firstFlight?.flight_number,
                    departure_airport: firstFlight?.departure_airport?.name,
                    departure_time: firstFlight?.departure_airport?.time,
                    arrival_airport: lastFlight?.arrival_airport?.name,
                    arrival_time: lastFlight?.arrival_airport?.time,
                    duration: item.total_duration,
                    stops: item.flights?.length - 1,
                    layovers: item.layovers?.map((l) => `${l.name} (${l.duration} min)`),
                    carbon_emissions: item.carbon_emissions?.this_flight,
                    booking_token: item.booking_token,
                    extensions: item.extensions
                };
            }).slice(0, 10); // Limit to 10 results
            if (flights.length === 0) {
                return {
                    content: [{ type: 'text', text: `No flights found from ${departure} to ${arrival} on ${outbound_date}` }],
                    structuredContent: { flights: [] },
                };
            }
            // Format as human-readable text
            const flightDescriptions = flights.map((flight, index) => {
                let desc = `${index + 1}. **${flight.airline}** ${flight.flight_number || ''}`;
                desc += `\n   💰 **Price**: $${flight.price}`;
                desc += `\n   🛫 **Departure**: ${flight.departure_airport} at ${flight.departure_time}`;
                desc += `\n   🛬 **Arrival**: ${flight.arrival_airport} at ${flight.arrival_time}`;
                desc += `\n   ⏱️ **Duration**: ${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m`;
                if (flight.stops === 0) {
                    desc += `\n   ✈️ **Stops**: Nonstop`;
                }
                else {
                    desc += `\n   ✈️ **Stops**: ${flight.stops}`;
                    if (flight.layovers && flight.layovers.length > 0) {
                        desc += ` (${flight.layovers.join(', ')})`;
                    }
                }
                if (flight.carbon_emissions) {
                    desc += `\n   🌱 **CO₂**: ${flight.carbon_emissions}g`;
                }
                return desc;
            }).join('\n\n');
            const tripType = return_date ? `Round trip (${outbound_date} - ${return_date})` : `One way (${outbound_date})`;
            const classText = travel_class.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            const summary = `✈️ **Flight Search Results**
Route: ${departure} → ${arrival}
${tripType}
Passengers: ${adults} adult${adults !== 1 ? 's' : ''}
Class: ${classText}

Found ${flights.length} flight option${flights.length !== 1 ? 's' : ''}:\n\n${flightDescriptions}`;
            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: {
                    route: { departure, arrival },
                    dates: { outbound: outbound_date, return: return_date },
                    passengers: adults,
                    travel_class,
                    flights,
                    count: flights.length
                },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Failed to search flights: ${message}` }],
                structuredContent: { flights: [], error: message },
            };
        }
    });
}
