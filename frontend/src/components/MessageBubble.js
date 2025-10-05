/* -------------------------------------------------------------------------- */
/* components/MessageBubble.js */
/* -------------------------------------------------------------------------- */
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'


export default function MessageBubble({role, text}) {
const isUser = role === 'user'
return (
<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
<div
className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'
}`}
>
{isUser ? (
<div className="whitespace-pre-wrap">{text}</div>
) : (
<div className="prose prose-sm max-w-none">
<ReactMarkdown
remarkPlugins={[remarkGfm]}
components={{
p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
code: ({inline, children, ...props}) => {
if (inline) {
return <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>
}
return <code className="block bg-slate-800 text-white px-3 py-2 rounded text-sm overflow-x-auto" {...props}>{children}</code>
},
pre: ({children}) => <pre className="bg-slate-800 rounded my-2 overflow-x-auto">{children}</pre>,
ul: ({children}) => <ul className="list-disc list-inside my-1">{children}</ul>,
ol: ({children}) => <ol className="list-decimal list-inside my-1">{children}</ol>,
li: ({children}) => <li className="my-0.5">{children}</li>
}}
>
{text}
</ReactMarkdown>
</div>
)}
</div>
</div>
)
}

