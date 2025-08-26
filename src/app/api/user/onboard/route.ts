import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth', request.url), { status: 303 })

  const formData = await request.formData()
  const time_preference = formData.get('time_preference') as string | null
  const tone_preference = formData.get('tone_preference') as string | null
  let appreciation_channel = formData.get('appreciation_channel') as string | null
  // Normalize hyphenated value to underscore
  if (appreciation_channel === 'in-person') appreciation_channel = 'in_person'

  const validTime = time_preference === 'morning' || time_preference === 'evening'
  const validTone = tone_preference === 'fun' || tone_preference === 'gentle'
  const validChannel = (appreciation_channel === 'text' || appreciation_channel === 'in_person')

  if (!validTime || !validTone || !validChannel) {
    return NextResponse.redirect(new URL('/onboarding?error=1', request.url), { status: 303 })
  }

  try {
    // Merge into settings and set onboarded_at
    const { data: existing } = await supabase
      .from('profiles')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    const merged = { ...(existing?.settings || {}), time_preference, tone_preference, appreciation_channel }

    await supabase
      .from('profiles')
      .update({ 
        onboarded_at: new Date().toISOString(), 
        settings: merged, 
        time_preference, 
        tone_preference, 
        appreciation_channel 
      })
      .eq('user_id', user.id)

  } catch (e) {
    console.error('Onboarding update failed', e)
    return NextResponse.redirect(new URL('/onboarding?error=1', request.url), { status: 303 })
  }

  return NextResponse.redirect(new URL('/home', request.url), { status: 303 })
}
