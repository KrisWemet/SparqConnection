import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's active pair
    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .select(`
        *,
        partner_a:user_a (
          user_id,
          full_name,
          email,
          avatar_url
        ),
        partner_b:user_b (
          user_id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('status', 'active')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .single()

    if (pairError || !pair) {
      return NextResponse.json({ partner: null, hasPair: false })
    }

    // Determine which user is the partner
    const partner = pair.user_a === user.id ? pair.partner_b : pair.partner_a

    return NextResponse.json({
      partner: {
        user_id: partner.user_id,
        full_name: partner.full_name,
        email: partner.email,
        avatar_url: partner.avatar_url
      },
      hasPair: true,
      pairStatus: pair.status,
      pairCreatedAt: pair.created_at
    })

  } catch (error) {
    console.error('Partner GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}