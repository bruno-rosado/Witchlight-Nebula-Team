export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end()
    const { a, b } = req.body

    const rpc = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/call',
        params: { name: 'add', arguments: { a, b } }
    }

    const MCP_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp'
    const fetchRes = await fetch(MCP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(rpc)
    })

    const json = await fetchRes.json()
    res.status(fetchRes.status).json(json)
}
