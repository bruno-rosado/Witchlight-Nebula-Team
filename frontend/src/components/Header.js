/* -------------------------------------------------------------------------- */
/* components/Header.js */
/* -------------------------------------------------------------------------- */
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'


export default function Header() {
return (
<header className="bg-white shadow-sm py-3 px-6 flex items-center justify-between">
<div className="flex items-center gap-3">
<Image src="/nebulaicon.svg" alt="favicon" width={24} height={24} />
<span className="text-lg font-semibold">Witchlight Nebula</span>
</div>
<Link href="/about" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
About
</Link>
</header>
)
}