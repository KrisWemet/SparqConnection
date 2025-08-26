import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: connectionId } = await params

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    // Check what type of connection this is by looking at query params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'pair' or 'invite'

    if (type === 'invite') {
      // Remove a pending invite (either sent by user or sent to user)
      const { data: invite, error: inviteError } = await supabase
        .from('connection_invites')
        .select('*')
        .eq('id', connectionId)
        .or(`inviter_id.eq.${user.id},invitee_email.eq.(SELECT email FROM profiles WHERE user_id = ${user.id})`)
        .single()

      if (inviteError || !invite) {
        return NextResponse.json({ 
          error: 'Invite not found or access denied' 
        }, { status: 404 })
      }

      // Cancel the invite
      const { error: deleteError } = await supabase
        .from('connection_invites')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      if (deleteError) {
        console.error('Error cancelling invite:', deleteError)
        return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Invite cancelled successfully' 
      })
    } else {
      // Remove an active connection (pair)
      const { data: pair, error: pairError } = await supabase
        .from('pairs')
        .select('*')
        .eq('id', connectionId)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .single()

      if (pairError || !pair) {
        return NextResponse.json({ 
          error: 'Connection not found or access denied' 
        }, { status: 404 })
      }

      // Update pair status to 'ended' instead of deleting
      const { error: updateError } = await supabase
        .from('pairs')
        .update({
          status: 'ended',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      if (updateError) {
        console.error('Error ending connection:', updateError)
        return NextResponse.json({ error: 'Failed to end connection' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Connection ended successfully' 
      })
    }

  } catch (error) {
    console.error('Connections DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}