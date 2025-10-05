// ----------------------------- add.ts -----------------------------
// Purpose: Defines and registers a simple "Addition Tool" for the MCP server.
// ------------------------------------------------------------------
import { z } from "zod"; // zod is used to define and validate input/output schemas
/**
 * register()
 * This function takes your MCP server instance and registers the "add" tool.
 */
export function register(server) {
    // Each tool has:
    // 1. A unique name ('add')
    // 2. Metadata (title, description)
    // 3. Input/output schemas
    // 4. The async function that performs the work
    server.registerTool("add", // internal name used by MCP clients to call the tool
    {
        title: "Addition Tool", // human-readable name
        description: "Add two numbers", // what it does
        // registerTool expects raw zod shapes; use `.shape` to provide ZodRawShape
        inputSchema: z.object({
            a: z.number(),
            b: z.number(),
        }).shape,
        outputSchema: z.object({ result: z.number() }).shape, // output will contain a "result" number
    }, 
    // async function that runs when this tool is called
    async ({ a, b }) => {
        // Compute result
        const output = { result: a + b };
        // Return both a text representation and a structured JSON object
        return {
            // 'content' provides a human-readable format (often for logging or chat)
            content: [
                {
                    type: "text", // type of content
                    text: JSON.stringify(output), // stringified JSON output
                },
            ],
            // 'structuredContent' is the actual object for machine parsing
            structuredContent: output,
        };
    });
}
