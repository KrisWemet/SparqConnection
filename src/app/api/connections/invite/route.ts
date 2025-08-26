import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { generateSecureInviteToken, generateInviteCode } from '@/lib/crypto'

// Validation schema for invite request
const InviteRequestSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  personalized_message: z.string().optional(),
  send_email: z.boolean().default(true)
})

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
    const validation = InviteRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { email: inviteeEmail, personalized_message, send_email } = validation.data

    // Check if inviting themselves
    if (inviteeEmail === profile.email) {
      return NextResponse.json({ 
        error: 'Cannot invite yourself' 
      }, { status: 400 })
    }

    // Check if already connected
    const { data: existingPair, error: pairCheckError } = await supabase
      .from('pairs')
      .select('id, status')
      .or(`and(user_a.eq.${user.id},user_b.eq.(SELECT user_id FROM profiles WHERE email = '${inviteeEmail}')),and(user_b.eq.${user.id},user_a.eq.(SELECT user_id FROM profiles WHERE email = '${inviteeEmail}'))`)
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

    // Expire old pending invites from this user to this email
    await supabase
      .from('connection_invites')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('inviter_id', user.id)
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'pending')

    // Generate secure token and fallback code
    const secureToken = generateSecureInviteToken(168) // 7 days
    const inviteCode = generateInviteCode() // 6-digit fallback
    
    // Get or create invitee user ID for better tracking
    let inviteeUserId = null
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', inviteeEmail)
      .maybeSingle()
    
    if (existingUser) {
      inviteeUserId = existingUser.user_id
    }

    // Create new invite with secure token
    const { data: invite, error: insertError } = await supabase
      .from('connection_invites')
      .insert({
        inviter_id: user.id,
        invitee_id: inviteeUserId,
        invitee_email: inviteeEmail,
        invite_code: inviteCode, // Keep for backward compatibility
        token_hash: secureToken.hash, // Store hashed token
        status: 'pending',
        expires_at: secureToken.expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        metadata: personalized_message ? { personalized_message } : null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating invite:', insertError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Send invitation email
    let emailResult = null
    let inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.sparqconnection.com'}/accept-connection?token=${secureToken.token}`
    
    if (send_email) {
      try {
        emailResult = await emailService.sendInviteEmail(inviteeEmail, {
          inviterName: profile.full_name || profile.email,
          inviterEmail: profile.email,
          inviteLink,
          inviteCode,
          expiresAt: secureToken.expiresAt.toISOString()
        })
        
        // Update invite with email sent timestamp
        if (emailResult.success) {
          await supabase
            .from('connection_invites')
            .update({ 
              email_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', invite.id)
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Don't fail the whole request if email fails
        emailResult = { success: false, error: 'Email sending failed' }
      }
    }
    
    // Prepare response based on email success
    const response: any = {
      message: 'Invite created successfully',
      invite: {
        id: invite.id,
        invitee_email: inviteeEmail,
        invite_code: inviteCode,
        invite_link: inviteLink,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
        email_sent: emailResult?.success || false
      }
    }
    
    if (emailResult?.success) {
      response.message = `Invitation email sent to ${inviteeEmail}!`
    } else if (send_email && !emailResult?.success) {
      response.instructions = `Email failed to send. Share this link with ${inviteeEmail}: ${inviteLink}\n\nOr they can enter this code manually: ${inviteCode}`
      response.message = 'Invite created, but email failed to send'
    } else {
      response.instructions = `Share this link with ${inviteeEmail}: ${inviteLink}\n\nOr they can enter this code manually: ${inviteCode}`
    }
    
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Connections invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}