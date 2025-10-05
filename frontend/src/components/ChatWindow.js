import React, { useState } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

const seedMessages = [
  { id: 1, role: 'assistant', text: 'Hello! I am Nabula — ask me anything.' }
]

export default function ChatWindow() {
  const [messages, setMessages] = useState(seedMessages)
  const [isThinking, setIsThinking] = useState(false)

  const sendMessage = async (text) => {
    if (!text.trim()) return

    const userMessage = { id: Date.now(), role: 'user', text }
    setMessages((m) => [...m, userMessage])

    setIsThinking(true)
    try {
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text })
      })
      const data = await r.json()
      const assistantText = data?.answer ?? data?.reply ?? data?.message ?? (typeof data === 'string' ? data : '(no answer)')
      const assistant = { id: Date.now() + 1, role: 'assistant', text: assistantText }
      setMessages((m) => [...m, assistant])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Nabula</h1>
            <div className="text-sm text-slate-500">Lightweight chat interface</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <MessageList messages={messages} isThinking={isThinking} />
      </div>

      <div className="px-6 py-4 border-t mb-4">
        <ChatInput onSend={sendMessage} disabled={isThinking} />
      </div>
    </div>
  )
}
