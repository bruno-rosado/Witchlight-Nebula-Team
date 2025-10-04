'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AskForm() {
    const [a, setA] = useState('')
    const [b, setB] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

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
            // navigate to /result with state via URL params
            router.push(`/result?result=${encodeURIComponent(JSON.stringify(json))}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="flex gap-2 items-center">
            <input className="px-2 py-1 border rounded" value={a} onChange={e => setA(e.target.value)} placeholder="a" />
            <input className="px-2 py-1 border rounded" value={b} onChange={e => setB(e.target.value)} placeholder="b" />
            <button className="px-3 py-1 bg-black text-white rounded" disabled={loading} type="submit">{loading ? '...' : 'Add'}</button>
        </form>
    )
}
