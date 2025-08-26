import { getAuthContext } from '@/lib/guards'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DeepenPersonalizationPage() {
  const { user } = await getAuthContext('user_id')
  if (!user) redirect('/auth')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <header className="py-6">
          <Link href="/personalize" className="text-gray-700">← Back</Link>
        </header>
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Deepen personalization</h1>
          <p className="text-gray-700 mb-4">Optional, 5–7 minutes. Fills in a few more preferences to tailor prompts and pacing.</p>
          <ul className="text-sm text-gray-700 list-disc ml-5 mb-4">
            <li>Boundaries & pacing comfort</li>
            <li>Space vs. reassurance signals</li>
            <li>Timing + notification frequency</li>
          </ul>
          <div className="text-xs text-gray-500 mb-4">Always non-clinical. You control sharing.</div>
          <div className="flex gap-3">
            <Link href="#" className="flex-1 text-center bg-gray-300 text-gray-700 py-3 rounded-md font-medium cursor-not-allowed">Coming soon</Link>
            <Link href="/personalize" className="flex-1 text-center border py-3 rounded-md font-medium text-gray-800 hover:bg-gray-50">Back</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

