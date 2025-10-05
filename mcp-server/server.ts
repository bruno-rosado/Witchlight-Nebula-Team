// ----------------------------- IMPORTS -----------------------------

// McpServer = creates and manages your own MCP server (like a mini API that follows MCP protocol rules).
// ResourceTemplate = defines "dynamic" resource URLs (e.g. greeting://{name}) that can change based on input.
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

// StreamableHTTPServerTransport = ha`ndles streaming JSON-RPC over HTTP
// between this MCP server and any client (like a Next.js app or CLI tool).
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// express = lightweight Node.js web framework for defining routes such as /mcp.
import express from 'express';

// zod = library for schema validation; defines the shape and type of inputs/outputs.
import { z } from 'zod';

// registerTools = centralized function to register all tools from the ./tools directory.
import { registerAll as registerTools } from './tools/index.js';

// ----------------------------- MCP SERVER SETUP -----------------------------

// Create an MCP server instance named "demo-server".
// This object will hold all the tools and resources you register.
const server = new McpServer({
    name: 'demo-server',     // friendly server name (shows up in client listings)
    version: '1.0.0'         // version number of this server
});


// ----------------------------- REGISTER A RESOURCE -----------------------------

// // Register a dynamic "Greeting" resource that generates text like "Hello, Brittany!"
// server.registerResource(
//     'greeting',   // internal ID for the resource type

//     // ResourceTemplate defines the URI format: greeting://{name}
//     // When a client requests greeting://Alice, {name} becomes "Alice".
//     new ResourceTemplate('greeting://{name}', { list: undefined }),

//     // ---- RESOURCE METADATA ----
//     {
//         title: 'Greeting Resource',        // name shown to clients
//         description: 'Dynamic greeting generator'  // description for documentation/UI
//     },

//     // ---- RESOURCE HANDLER FUNCTION ----
//     // Called whenever someone reads a greeting://... URI.
//     async (uri, { name }) => ({
//         // Return a list of "content objects" describing what's in this resource.
//         contents: [
//             {
//                 uri: uri.href,             // full URI string (e.g. greeting://Alice)
//                 text: `Hello, ${name}!`    // actual text content
//             }
//         ]
//     })
// );


// ----------------------------- REGISTER TOOLS -----------------------------
// Call the centralized function to register all tools from the ./tools directory.
// Register all tools here (await if your index uses dynamic imports)

await registerTools(server);

// ----------------------------- EXPRESS SERVER SETUP -----------------------------
// Create an Express app instance to expose an HTTP endpoint.
const app = express();
// Use built-in JSON parser so req.body automatically becomes a JS object.
app.use(express.json());


// ----------------------------- /mcp ROUTE -----------------------------

// Define the POST route where MCP clients send their requests.
app.post('/mcp', async (req, res) => {

    // Each HTTP request gets its own transport instance
    // to avoid request-ID collisions between simultaneous calls.
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,   // use default session IDs
        enableJsonResponse: true         // tell the transport to reply in JSON
    });

    // When the client disconnects or the response ends, close the transport cleanly.
    res.on('close', () => {
        transport.close();
    });

    // Link the MCP server logic to this HTTP transport.
    await server.connect(transport);

    // Ask the transport to handle the incoming JSON-RPC request body
    // and write the response back to the HTTP response object.
    console.log('Incoming /mcp request body:', JSON.stringify(req.body));
    await transport.handleRequest(req, res, req.body);
});


// ----------------------------- START THE SERVER -----------------------------
// Pick a port: use PORT from env if set, otherwise default to 3000.
const port = parseInt(process.env.PORT || '3000');
// Start the Express server listening.
app.listen(port, () => {
    // Log a startup message to the console for confirmation.
    console.log(`Demo MCP Server running on http://localhost:${port}/mcp`);
})
// Handle any startup errors (e.g. port already in use).
.on('error', error => {
    console.error('Server error:', error);
    process.exit(1); // exit the process so it doesn't hang
});

// -------------------------- HOPEFULLY THIS WORKS ------------------------
// copy pasted straigh from gemini
// Assuming your Express app instance is named 'app'
// You need to import 'app' if this is a separate file, or define it here.

app.get('/mcp', (req, res) => {
  // Send a simple text response back to the browser
  res.send('Hello from the MCP Server!'); 
  
  // Or if it's an API, you might send JSON:
  // res.json({ message: 'MCP status: Online' });
});

// You might also want to add a root route for '/'
app.get('/', (req, res) => {
  res.send('Welcome to the root of the server.');
});
