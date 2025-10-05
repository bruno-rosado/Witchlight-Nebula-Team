import { useState } from 'react'
import Head from 'next/head'
import ChatWindow from '../components/ChatWindow'
import Sidebar from '../components/SideBar'
import Header from '../components/Header'

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
    <>
      <Head>
        <title>AI Bot Chat</title>
        <meta 
          name="description" 
          content="A lightweight Gemini-style chat UI built with Next.js + Tailwind" 
        />
      </Head>

      <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Header stays at the top */}
        <Header />

        {/* Main content area fills remaining space */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - fixed width */}
          <aside className="w-64 bg-gray-800 text-white">
            <Sidebar />
          </aside>

          {/* ChatWindow - fills remaining space */}
          <main className="flex-1">
            <ChatWindow />
          </main>
        </div>
      </div>
    </>
  );
}
