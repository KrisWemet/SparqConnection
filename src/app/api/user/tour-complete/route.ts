import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })

  let prefs: any = {}
  try {
    prefs = await request.json()
  } catch {}

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    const merged = {
      ...(profile?.settings || {}),
      ...(prefs?.timePref ? { time_pref: prefs.timePref } : {}),
      ...(prefs?.thanksMode ? { thanks_mode: prefs.thanksMode } : {}),
      ...(prefs?.tone ? { tone: prefs.tone } : {}),
      plain_language: true,
    }

    await supabase
      .from('profiles')
      .update({ tour_completed: true, settings: merged })
      .eq('user_id', user.id)
  } catch {}

  return NextResponse.json({ ok: true })
}
