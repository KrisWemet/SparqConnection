import { getAuthContext } from '@/lib/guards'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function PersonalizeLanding() {
  const { user, profile } = await getAuthContext('user_id,attachment_tendencies,love_language_rank,copy_profile')
  if (!user) redirect('/auth')

  const hasPersonalization = !!(profile?.attachment_tendencies || profile?.love_language_rank)
  const tsA = profile?.attachment_tendencies?.updated_at
  const tsL = profile?.love_language_rank?.updated_at
  const lastUpdatedIso = tsA || tsL || null
  const lastUpdated = lastUpdatedIso ? new Date(lastUpdatedIso).toLocaleDateString() : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <header className="py-6">
          <Link href="/home" className="text-gray-700">← Back</Link>
        </header>
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('personalize.card.title')}</h1>
          <p className="text-gray-700 mb-4">{t('personalize.card.body')}</p>
          <ul className="text-sm text-gray-700 list-disc ml-5 mb-4">
            <li>Two quick micro‑quizzes (not clinical)</li>
            <li>You control what your partner can see</li>
            <li>Retake anytime</li>
          </ul>
          <div className="text-xs text-gray-500 mb-2">{t('personalize.disclaimer')}</div>
          {hasPersonalization && (
            <div className="text-xs text-gray-700 mb-4">
              {t('personalize.result.label', { pattern: `${profile?.copy_profile?.benefits_reassurance ? 'More reassurance helps' : ''}${profile?.copy_profile?.benefits_reassurance && profile?.copy_profile?.prefers_space ? ' • ' : ''}${profile?.copy_profile?.prefers_space ? 'Clear structure helps' : ''}`, date: lastUpdated || '' })}
            </div>
          )}
          <div className="flex gap-3">
            <Link href="/personalize/quiz" className="flex-1 text-center bg-pink-600 text-white py-3 rounded-md font-medium hover:bg-pink-700">{hasPersonalization ? t('personalize.retake') : t('personalize.card.cta_start')}</Link>
            <Link href="/home" className="flex-1 text-center border py-3 rounded-md font-medium text-gray-800 hover:bg-gray-50">{t('personalize.card.cta_later')}</Link>
          </div>
          <div className="mt-4 text-center">
            <Link href="/personalize/deepen" className="text-sm text-blue-600 hover:text-blue-800">Deepen personalization</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
