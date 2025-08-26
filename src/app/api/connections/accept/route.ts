import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashToken, isValidTokenFormat } from '@/lib/crypto'

// Validation schemas for accept request
const AcceptByCodeSchema = z.object({
  invite_code: z.string().length(6, 'Invite code must be 6 digits').regex(/^\d{6}$/, 'Invite code must be numeric')
})

const AcceptByTokenSchema = z.object({
  invite_token: z.string().min(40, 'Invalid token format')
})

const AcceptRequestSchema = z.union([AcceptByCodeSchema, AcceptByTokenSchema])

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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = AcceptRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const validatedData = validation.data
    let invite = null
    let inviteError = null

    // Handle secure token or 6-digit code
    if ('invite_token' in validatedData) {
      // New secure token system
      const { invite_token } = validatedData
      
      if (!isValidTokenFormat(invite_token)) {
        return NextResponse.json({ 
          error: 'Invalid token format' 
        }, { status: 400 })
      }

      const tokenHash = hashToken(invite_token)
      
      // Find invite by token hash
      const result = await supabase
        .from('connection_invites')
        .select('*')
        .eq('token_hash', tokenHash)
        .eq('status', 'pending')
        .single()
      
      invite = result.data
      inviteError = result.error
      
      // For token-based invites, we might not have the exact email match
      // Check if user can accept this invite (either by email or user_id)
      if (invite && invite.invitee_email && invite.invitee_email !== profile.email) {
        // If invite has specific email and it doesn't match, reject
        invite = null
        inviteError = { message: 'This invitation is not for your email address' }
      }
      
    } else {
      // Legacy 6-digit code system
      const { invite_code } = validatedData
      
      const result = await supabase
        .from('connection_invites')
        .select('*')
        .eq('invite_code', invite_code)
        .eq('status', 'pending')
        .eq('invitee_email', profile.email)
        .single()
      
      invite = result.data
      inviteError = result.error
    }

    if (inviteError || !invite) {
      return NextResponse.json({ 
        error: 'invite_token' in validatedData 
          ? 'Invalid or expired invitation link' 
          : 'Invalid or expired invite code'
      }, { status: 404 })
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('connection_invites')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', invite.id)

      return NextResponse.json({ 
        error: 'Invite code has expired' 
      }, { status: 410 })
    }

    // Check if users are already connected
    const { data: existingPair, error: pairCheckError } = await supabase
      .from('pairs')
      .select('id, status')
      .or(`and(user_a.eq.${invite.inviter_id},user_b.eq.${user.id}),and(user_b.eq.${invite.inviter_id},user_a.eq.${user.id})`)
      .maybeSingle()

    if (pairCheckError) {
      console.error('Error checking existing pair:', pairCheckError)
    } else if (existingPair) {
      return NextResponse.json({ 
        error: existingPair.status === 'active' 
          ? 'Already connected to this user' 
          : 'Connection already exists with this user'
      }, { status: 409 })
    }

    // Create the connection (pair)
    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .insert({
        user_a: invite.inviter_id,
        user_b: user.id,
        status: 'active',
        paired_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (pairError) {
      console.error('Error creating pair:', pairError)
      return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
    }

    // Mark invite as accepted and track email click if it was a token-based invite
    const updateData: any = {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Track email click for token-based invites
    if ('invite_token' in validatedData && !invite.email_clicked_at) {
      updateData.email_clicked_at = new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('connection_invites')
      .update(updateData)
      .eq('id', invite.id)

    if (updateError) {
      console.error('Error updating invite status:', updateError)
      // Connection was created successfully, so we don't fail here
    }

    // Get inviter profile for response
    const { data: inviterProfile, error: inviterError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', invite.inviter_id)
      .single()

    return NextResponse.json({ 
      message: 'Connection accepted successfully',
      connection: {
        id: pair.id,
        partner_email: inviterProfile?.email || 'Unknown',
        partner_name: inviterProfile?.full_name || 'Unknown',
        connected_at: pair.paired_at,
        status: 'active'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Connections accept error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}