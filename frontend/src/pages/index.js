import { useState } from 'react'
import AskForm from '@/components/AskForm'

export default function Home() {

  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setRes(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await r.json();
      setRes(data);
    } finally {
      setLoading(false);
    }
  }

    return (
        <main className="p-8">
                  <h1>MCP Ask</h1>
      <form onSubmit={onSubmit}>
        <textarea
          rows={4}
          placeholder="Ask a question…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: "100%", padding: 12 }}
        />
        <button disabled={loading} style={{ marginTop: 12 }}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {res && (
        <pre style={{ background: "#f6f6f6", padding: 12, marginTop: 16, overflowX: "auto" }}>
          {JSON.stringify(res, null, 2)}
        </pre>
      )}
            <AskForm />
        </main>
    )
}
