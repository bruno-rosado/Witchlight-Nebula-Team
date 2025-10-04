import { useRouter } from 'next/router'

export default function Result() {
    const router = useRouter()
    const { result } = router.query
    let parsed = null
    try { parsed = result ? JSON.parse(result) : null } catch (e) { parsed = result }

    return (
        <div className="p-8">
            <h1 className="text-2xl mb-4">Result (Pages Router)</h1>
            <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(parsed, null, 2)}</pre>
        </div>
    )
}
