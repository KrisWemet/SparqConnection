import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { selectPromptVariant, getCQDocVersion } from '@/lib/cq-variants'
import { computeCopyFlags, type AttachmentPrimary, type LoveLanguage } from '@/lib/personalization-engine'

function bucketConfidence(c: number | undefined): 'low' | 'med' | 'high' {
  if (!c && c !== 0) return 'low'
  if (c < 0.5) return 'low'
  if (c < 0.7) return 'med'
  return 'high'
}

export async function GET(request: NextRequest) {
  const stepId = request.nextUrl.searchParams.get('step_id') || ''
  if (!stepId) return NextResponse.json({ error: 'Missing step_id' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load flags for current user
  const { data: profile } = await supabase
    .from('profiles')
    .select('copy_profile, attachment_tendencies, love_language_rank, share_with_partner')
    .eq('user_id', user.id)
    .single()

  const flags = profile?.copy_profile || {}
  const att = profile?.attachment_tendencies || null
  const ll = profile?.love_language_rank || null
  const attConf: number = Number(att?.confidence || 0)
  const dist = att?.distribution || null

  // Compute entropy_low using engine helper (approx via normalization + entropy)
  let entropyLow = false
  try {
    // Avoid importing private helpers; compute simple entropy here
    const d = dist ? Object.values(dist as Record<string, number>) : []
    const sum = d.reduce((a, b) => a + b, 0)
    const norm = sum > 0 ? d.map(v => v / (sum > 1.01 ? 100 : 1)) : []
    let e = 0
    for (const v of norm) if (v > 0) e += -v * Math.log2(v)
    entropyLow = e > 1.2 || attConf < 0.5
  } catch { entropyLow = attConf < 0.5 }

  // Pairing logic with consent gate (no labels unless both consent)
  let pairing: string | null = null
  try {
    const { data: pair } = await supabase
      .from('pairs')
      .select('id, user_a, user_b')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .maybeSingle()
    if (pair) {
      const partnerId = pair.user_a === user.id ? pair.user_b : pair.user_a
      const { data: partner } = await supabase
        .from('profiles')
        .select('attachment_tendencies, share_with_partner')
        .eq('user_id', partnerId)
        .single()
      const selfShare = !!profile?.share_with_partner?.show_labels
      const partnerShare = !!partner?.share_with_partner?.show_labels
      if (selfShare && partnerShare) {
        const a = (att?.primary as string) || 'secure'
        const b = (partner?.attachment_tendencies?.primary as string) || 'secure'
        const norm = (x: string) => (x === 'anxious' ? 'anx' : x === 'avoidant' ? 'avoid' : x === 'mixed' ? 'mixed' : 'secure')
        pairing = `${norm(a)}_${norm(b)}`
      } else {
        pairing = null
      }
    }
  } catch {}

  // Prepare selection inputs
  const selection = selectPromptVariant({ stepId, flags, pairing, entropyLow })
  if (!selection) return NextResponse.json({ error: 'Content unavailable' }, { status: 404 })

  // Log event to event_log (server-side)
  try {
    const confidence_bucket = bucketConfidence(attConf)
    await supabase.from('event_log').insert({
      user_id: user.id,
      name: 'cq_variant_served',
      props: {
        step_id: stepId,
        copy_variant_id: selection.copy_variant_id,
        pairing: pairing || 'neutral',
        confidence_bucket,
        entropy_low: entropyLow,
        cq_doc_version: getCQDocVersion() || 'unknown'
      }
    })
  } catch {}

  return NextResponse.json({
    step_id: stepId,
    copy_variant_id: selection.copy_variant_id,
    text: selection.text,
    entropy_low: entropyLow
  })
}

