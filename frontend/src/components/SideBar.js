import React from 'react'

export default function Sidebar() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 h-full text-slate-800">
      <h2 className="text-lg font-semibold mb-3">Conversations</h2>

      <div className="space-y-2">
        <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50">
          + New chat
        </button>

        <div className="mt-4">
          {/* Example static history items (hardcoded) */}
          <div className="text-sm text-slate-500">Recent</div>
          <ul className="mt-2 space-y-2">
            <li className="px-3 py-2 bg-slate-50 rounded-lg">Wheather investigation</li>
            <li className="px-3 py-2 bg-slate-50 rounded-lg">Mission</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
