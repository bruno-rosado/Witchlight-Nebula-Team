import { useState } from 'react'
import Router from 'next/router'

export default function Home() {
    const [a, setA] = useState('')
    const [b, setB] = useState('')
    const [loading, setLoading] = useState(false)

    async function onSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ a: Number(a), b: Number(b) })
            })
            const json = await res.json()
            Router.push(`/result?result=${encodeURIComponent(JSON.stringify(json))}`)
        } finally { setLoading(false) }
    }

    return (
        <main className="p-8">
            <h1 className="text-2xl mb-4">Home (Pages Router)</h1>
            <form onSubmit={onSubmit} className="flex gap-2">
                <input value={a} onChange={e => setA(e.target.value)} placeholder="a" className="px-2 py-1 border rounded" />
                <input value={b} onChange={e => setB(e.target.value)} placeholder="b" className="px-2 py-1 border rounded" />
                <button disabled={loading} className="px-3 py-1 bg-black text-white rounded">{loading ? '...' : 'Add'}</button>
            </form>
        </main>
    )
}
