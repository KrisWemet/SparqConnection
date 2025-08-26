import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeCopyFlags, type AttachmentPrimary, type LoveLanguage } from '@/lib/personalization-engine'

type AttachmentPrimary = 'secure' | 'anxious' | 'avoidant' | 'mixed'
type LoveLanguage = 'words' | 'acts' | 'time' | 'touch' | 'gifts'

export async function GET(request: NextRequest) {
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

  const { data, error } = await supabase
    .from('profiles')
    .select('attachment_tendencies, love_language_rank, share_with_partner, copy_profile, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({
    attachment_tendencies: data?.attachment_tendencies || null,
    love_language_rank: data?.love_language_rank || null,
    share_with_partner: data?.share_with_partner || { show_tips: true, show_labels: false },
    copy_profile: data?.copy_profile || null,
    last_updated: data?.updated_at || null
  })
}

export async function POST(request: NextRequest) {
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

  const payload = await request.json().catch(() => null)
  if (!payload) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const attachment = payload.attachment_tendencies as {
    distribution?: Partial<Record<AttachmentPrimary, number>>,
    primary?: AttachmentPrimary,
    confidence?: number,
    updated_at?: string
  } | null

  const ll = payload.love_language_rank as {
    order?: LoveLanguage[],
    top?: LoveLanguage[],
    confidence?: number,
    updated_at?: string
  } | null

  const share = payload.share_with_partner as { show_tips?: boolean; show_labels?: boolean } | null

  // Compute copy_profile flags using rules if available, else fallback
  const copyFlags = computeCopyFlags(
    attachment ? {
      distribution: (attachment.distribution || {}) as any,
      primary: (attachment.primary || 'secure') as AttachmentPrimary,
      confidence: typeof attachment.confidence === 'number' ? attachment.confidence : 0.5,
    } : null,
    ll ? {
      ranked_list: (ll.order || []) as LoveLanguage[],
      top_two: (ll.top || (ll.order || []).slice(0,2)) as LoveLanguage[],
      confidence: typeof ll.confidence === 'number' ? ll.confidence : 0.5,
    } : null
  )

  const copy_profile = {
    prefers_space: !!copyFlags.prefers_space?.value,
    benefits_reassurance: !!copyFlags.benefits_reassurance?.value,
    touch_affirming: !!copyFlags.touch_affirming?.value,
    words_affirming: !!copyFlags.words_affirming?.value,
    time_affirming: !!copyFlags.time_affirming?.value,
    prefers_structure: !!copyFlags.prefers_structure?.value,
  }

  try {
    await supabase
      .from('profiles')
      .update({
        attachment_tendencies: attachment ? {
          ...attachment,
          updated_at: new Date().toISOString()
        } : null,
        love_language_rank: ll ? {
          ...ll,
          updated_at: new Date().toISOString()
        } : null,
        share_with_partner: share ? {
          show_tips: !!share.show_tips,
          show_labels: !!share.show_labels
        } : undefined,
        copy_profile
      })
      .eq('user_id', user.id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Failed to save personalization', e)
    return NextResponse.json({ error: 'Failed to save personalization' }, { status: 500 })
  }
}
