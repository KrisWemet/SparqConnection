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

    // Expire old invites before querying
    await supabase.rpc('expire_old_invites')

    // Get connections using the view we created
    const { data: connections, error: connectionsError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('connected_at', { ascending: false })

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    // Separate active connections from pending invites
    const activeConnections = connections.filter(c => c.connection_type === 'active_connection')
    const pendingInvites = connections.filter(c => c.connection_type === 'pending_invite')

    // Also get invites sent to this user from others
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .single()

    const { data: incomingInvites, error: incomingError } = await supabase
      .from('connection_invites')
      .select(`
        id,
        inviter_id,
        invitee_email,
        invite_code,
        status,
        expires_at,
        created_at,
        profiles!inviter_id (email, full_name)
      `)
      .eq('invitee_email', profile?.email || '')
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())

    if (incomingError) {
      console.error('Error fetching incoming invites:', incomingError)
    }

    return NextResponse.json({
      active_connections: activeConnections.map(conn => ({
        id: conn.id,
        partner_id: conn.partner_id,
        partner_email: conn.partner_email,
        partner_name: conn.partner_name,
        status: conn.status,
        connected_at: conn.connected_at,
        connection_type: 'active'
      })),
      outgoing_invites: pendingInvites.map(invite => ({
        id: invite.id,
        invitee_email: invite.partner_email,
        status: invite.status,
        created_at: invite.connected_at,
        connection_type: 'pending_outgoing'
      })),
      incoming_invites: (incomingInvites || []).map(invite => ({
        id: invite.id,
        inviter_email: Array.isArray(invite.profiles) ? invite.profiles[0]?.email || 'Unknown' : 'Unknown',
        inviter_name: Array.isArray(invite.profiles) ? invite.profiles[0]?.full_name || 'Unknown' : 'Unknown',
        invite_code: invite.invite_code,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
        connection_type: 'pending_incoming'
      }))
    })

  } catch (error) {
    console.error('Connections GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}