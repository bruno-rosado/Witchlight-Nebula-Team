
// lib/mcpClient.js
// -------------------------------------------------
// Safe wrapper for MCP calls used by server-side code.
// This file intentionally avoids importing the MCP SDK at top-level so
// it won't be bundled into browser code. If called from the browser it
// throws an instructive error. On the server it dynamically imports the
// server-only helper at src/pages/api/mcpClient.js and forwards the call.

export async function callMcpTool(toolName, args = {}) {
    // If running in a browser environment, instruct the developer to call the API route instead.
    if (typeof window !== 'undefined') {
        throw new Error("callMcpTool is server-only. From browser code, POST to /api/ask instead.");
    }

    // Dynamically import the server-only helper so bundlers don't see SDK imports.
    const mod = await import('../pages/api/mcpClient.js');
    if (!mod || typeof mod.callMcpTool !== 'function') {
        throw new Error('Server MCP helper not found');
    }
    return mod.callMcpTool(toolName, args);
}
