'use client'
import { useState } from 'react'

export default function AskForm() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setAnswer('')
    setError('')

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setAnswer(json.answer || '(no answer)')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="border rounded p-3 h-32"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-4 p-4 border rounded bg-gray-50 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  )
}
