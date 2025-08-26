import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const CreatePartnerNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
  item_type: z.enum(['dq', 'micro_action', 'appreciation', 'reflection']),
  item_id: z.string().min(1, 'Item ID is required'),
  visible_to_partner: z.boolean().default(false)
})

const UpdatePartnerNoteSchema = z.object({
  id: z.string().uuid('Invalid note ID'),
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
  visible_to_partner: z.boolean().optional()
})

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const item_type = searchParams.get('item_type')
    const item_id = searchParams.get('item_id')
    const partner_notes_only = searchParams.get('partner_notes_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build base query for notes
    let query = supabase
      .from('notes')
      .select(`
        id,
        user_id,
        item_type,
        item_id,
        body,
        visible_to_partner,
        created_at,
        updated_at,
        profiles!inner (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: true })
      .limit(limit)

    // Filter by item if specified
    if (item_type) {
      query = query.eq('item_type', item_type)
    }
    if (item_id) {
      query = query.eq('item_id', item_id)
    }

    if (partner_notes_only) {
      // Get only partner's notes that are visible to current user
      query = query.neq('user_id', user.id).eq('visible_to_partner', true)
    } else {
      // Get user's own notes OR partner's visible notes
      query = query.or(`user_id.eq.${user.id},and(user_id.neq.${user.id},visible_to_partner.eq.true)`)
    }

    const { data: notes, error: notesError } = await query

    if (notesError) {
      console.error('Error fetching partner notes:', notesError)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    // Organize notes by item for easier consumption
    const notesByItem: Record<string, any[]> = {}
    notes.forEach(note => {
      const key = `${note.item_type}:${note.item_id}`
      if (!notesByItem[key]) {
        notesByItem[key] = []
      }
      notesByItem[key].push({
        id: note.id,
        user_id: note.user_id,
        content: note.body,
        visible_to_partner: note.visible_to_partner,
        author: {
          name: Array.isArray(note.profiles) ? note.profiles[0]?.full_name || 'Unknown' : 'Unknown',
          email: Array.isArray(note.profiles) ? note.profiles[0]?.email || 'Unknown' : 'Unknown',
          is_current_user: note.user_id === user.id
        },
        created_at: note.created_at,
        updated_at: note.updated_at
      })
    })

    return NextResponse.json({
      notes_by_item: notesByItem,
      total_notes: notes.length
    })

  } catch (error) {
    console.error('Partner notes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
    const validation = CreatePartnerNoteSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { content, item_type, item_id, visible_to_partner } = validation.data

    // Insert new note
    const { data: note, error: insertError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        body: content,
        item_type,
        item_id,
        visible_to_partner,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        user_id,
        item_type,
        item_id,
        body,
        visible_to_partner,
        created_at,
        updated_at
      `)
      .single()

    if (insertError) {
      console.error('Error creating partner note:', insertError)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    // Track activity if note is shared
    if (visible_to_partner) {
      try {
        await supabase
          .from('partner_activity')
          .insert({
            user_id: user.id,
            activity_type: 'note_added',
            item_type,
            item_id,
            metadata: { visible_to_partner: true },
            created_at: new Date().toISOString()
          })
      } catch (activityError) {
        console.error('Error tracking activity:', activityError)
        // Don't fail the request if activity tracking fails
      }
    }

    return NextResponse.json({ 
      message: 'Note created successfully',
      note: {
        ...note,
        content: note.body,
        author: {
          is_current_user: true
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Partner notes POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
    const validation = UpdatePartnerNoteSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { id, content, visible_to_partner } = validation.data

    // Update note (only if user owns it)
    const updateData: { body: string; updated_at: string; visible_to_partner?: boolean } = {
      body: content,
      updated_at: new Date().toISOString()
    }

    if (visible_to_partner !== undefined) {
      updateData.visible_to_partner = visible_to_partner
    }

    const { data: note, error: updateError } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Only allow updating own notes
      .select(`
        id,
        user_id,
        item_type,
        item_id,
        body,
        visible_to_partner,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating partner note:', updateError)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Note updated successfully',
      note: {
        ...note,
        content: note.body,
        author: {
          is_current_user: true
        }
      }
    })

  } catch (error) {
    console.error('Partner notes PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get ID from query params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Delete note (only if user owns it)
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting partner note:', deleteError)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Note deleted successfully' })

  } catch (error) {
    console.error('Partner notes DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}