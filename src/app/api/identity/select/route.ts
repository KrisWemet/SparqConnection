import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePremiumAccess } from '@/lib/subscription'

// Validation schema for identity selection
const SelectIdentitySchema = z.object({
  identity: z.string().min(1, 'Identity is required'),
  is_private: z.boolean().default(false),
  date: z.string().optional()
})

// Available identities (Premium users can access all, Free users get basic set)
const AVAILABLE_IDENTITIES = {
  free: [
    'Mindful Partner',
    'Caring Listener',
    'Supportive Companion',
    'Loving Friend'
  ],
  premium: [
    // All free identities plus premium ones
    'Mindful Partner',
    'Caring Listener', 
    'Supportive Companion',
    'Loving Friend',
    'Adventurous Explorer',
    'Creative Dreamer',
    'Gentle Strength',
    'Playful Spirit',
    'Deep Thinker',
    'Empathetic Heart',
    'Joyful Presence',
    'Wise Counselor',
    'Passionate Soul',
    'Peaceful Anchor',
    'Curious Mind',
    'Nurturing Guardian',
    'Bold Visionary',
    'Authentic Self',
    'Grateful Being',
    'Connected Soul'
  ]
}

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validation = SelectIdentitySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { identity, is_private, date } = validation.data
    const selectionDate = date || new Date().toISOString().split('T')[0]

    // Check if user has access to this identity
    const hasPremiumAccess = await requirePremiumAccess(user.id)
    const availableIdentities = hasPremiumAccess 
      ? AVAILABLE_IDENTITIES.premium 
      : AVAILABLE_IDENTITIES.free

    if (!availableIdentities.includes(identity)) {
      return NextResponse.json({ 
        error: 'Identity not available', 
        message: 'This identity requires a Premium subscription',
        upgrade_required: !hasPremiumAccess
      }, { status: 403 })
    }

    // Update user profile with selected identity
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        current_identity: identity,
        identity_is_private: is_private,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating identity:', updateError)
      return NextResponse.json({ error: 'Failed to update identity' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Identity selected successfully',
      selection: {
        identity: identity,
        is_private: is_private,
        selection_date: selectionDate
      }
    })

  } catch (error) {
    console.error('Identity selection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
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

    // Check if user has premium access
    const hasPremiumAccess = await requirePremiumAccess(user.id)
    
    // Get available identities based on subscription
    const availableIdentities = hasPremiumAccess 
      ? AVAILABLE_IDENTITIES.premium 
      : AVAILABLE_IDENTITIES.free

    // Get user's current identity from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_identity, identity_is_private')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({
      current_identity: profile?.current_identity || 'Mindful Partner',
      is_private: profile?.identity_is_private || false,
      available_identities: availableIdentities,
      has_premium_access: hasPremiumAccess,
      premium_identities_count: AVAILABLE_IDENTITIES.premium.length - AVAILABLE_IDENTITIES.free.length
    })

  } catch (error) {
    console.error('Get identity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}