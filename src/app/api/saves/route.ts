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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const item_type = searchParams.get('item_type')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query
    let query = supabase
      .from('saves')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Add filter if provided
    if (item_type) {
      query = query.eq('item_type', item_type)
    }

    const { data: saves, error: savesError } = await query

    if (savesError) {
      console.error('Error fetching saves:', savesError)
      return NextResponse.json({ error: 'Failed to fetch saves' }, { status: 500 })
    }

    return NextResponse.json({ saves })

  } catch (error) {
    console.error('Saves GET error:', error)
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

    // Parse request body
    const { item_type, item_id, content } = await request.json()
    
    if (!item_type || !item_id) {
      return NextResponse.json({ error: 'item_type and item_id are required' }, { status: 400 })
    }

    // Check if already saved (upsert behavior)
    const { data: existingSave, error: checkError } = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_type', item_type)
      .eq('item_id', item_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing save:', checkError)
      return NextResponse.json({ error: 'Failed to check existing save' }, { status: 500 })
    }

    if (existingSave) {
      return NextResponse.json({ 
        message: 'Already saved',
        alreadyExists: true,
        save: existingSave 
      })
    }

    // Insert new save
    const { data: save, error: insertError } = await supabase
      .from('saves')
      .insert({
        user_id: user.id,
        item_type,
        item_id,
        content: content || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating save:', insertError)
      return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
    }

    return NextResponse.json({ save, message: 'Item saved successfully' })

  } catch (error) {
    console.error('Saves POST error:', error)
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

    // Get parameters from query string or body
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const item_type = searchParams.get('item_type')
    const item_id = searchParams.get('item_id')
    
    if (!id && (!item_type || !item_id)) {
      return NextResponse.json({ 
        error: 'Either save ID or item_type+item_id is required' 
      }, { status: 400 })
    }

    // Delete by save ID or by item reference
    let query = supabase.from('saves').delete().eq('user_id', user.id)
    
    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('item_type', item_type).eq('item_id', item_id)
    }

    const { error: deleteError } = await query

    if (deleteError) {
      console.error('Error deleting save:', deleteError)
      return NextResponse.json({ error: 'Failed to remove save' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Save removed successfully' })

  } catch (error) {
    console.error('Saves DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}