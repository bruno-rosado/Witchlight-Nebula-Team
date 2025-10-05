/* -------------------------------------------------------------------------- */
/* components/MessageBubble.js */
/* -------------------------------------------------------------------------- */
import React from 'react'


export default function MessageBubble({role, text}) {
const isUser = role === 'user'
return (
<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
<div
className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm whitespace-pre-wrap ${
isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'
}`}
>
{text}
</div>
</div>
)
}

