/* -------------------------------------------------------------------------- */
/* components/ChatInput.js */
/* -------------------------------------------------------------------------- */
import React, {useState} from 'react'


export default function ChatInput({onSend, disabled}) {
const [value, setValue] = useState('')


const submit = (e) => {
e.preventDefault()
if (!value.trim()) return
onSend(value)
setValue('')
}


return (
<form onSubmit={submit} className="flex items-center gap-3">
<input
value={value}
onChange={(e) => setValue(e.target.value)}
placeholder="Ask anything..."
className="flex-1 rounded-xl border border-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
disabled={disabled}
/>


<button
type="submit"
className={`px-4 py-2 rounded-xl font-medium ${disabled ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white'}`}
disabled={disabled}
>
Send
</button>
</form>
)
}