/* -------------------------------------------------------------------------- */
/* components/MessageList.js */
/* -------------------------------------------------------------------------- */
import React, {useEffect, useRef} from 'react'
import MessageBubble from './MessageBubble'


export default function MessageList({messages, isThinking}) {
const containerRef = useRef(null)


useEffect(() => {
const el = containerRef.current
if (el) el.scrollTop = el.scrollHeight
}, [messages, isThinking])


return (
<div ref={containerRef} className="space-y-4">
{messages.map((m) => (
<MessageBubble key={m.id} role={m.role} text={m.text} />
))}


{isThinking && (
<div className="flex items-center">
<div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate-500">...</div>
<div className="ml-3 text-sm text-slate-500">Assistant is thinking</div>
</div>
)}
</div>
)
}