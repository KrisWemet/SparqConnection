import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trackEvent } from '@/lib/analytics'

// Validation schema for journal entries
const CreateJournalEntrySchema = z.object({
  encryptedContent: z.string().min(1, 'Content is required'),
  iv: z.string().min(1, 'IV is required'),
  encryptionMethod: z.string().default('AES-GCM-256'),
  
  // Metadata (unencrypted)
  wordCount: z.number().min(0),
  characterCount: z.number().min(0),
  
  // Privacy settings
  isPrivate: z.boolean().default(true),
  isSharedWithPartner: z.boolean().default(false),
  partnerCanView: z.boolean().default(false),
  
  // Optional AI insights (computed client-side)
  sentimentScore: z.number().min(-1).max(1).optional(),
  moodTags: z.array(z.string()).optional(),
  relationshipThemes: z.array(z.string()).optional(),
  
  // Context
  promptType: z.enum(['daily', 'custom', 'guided']).optional(),
  promptText: z.string().optional(),
  
  // Draft status
  isDraft: z.boolean().default(false),
  entryDate: z.string().optional() // ISO date string
})

const UpdateJournalEntrySchema = CreateJournalEntrySchema.partial().extend({
  id: z.string().uuid()
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeDrafts = searchParams.get('include_drafts') === 'true'
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build query
    let query = supabase
      .from('journal_entries')
      .select(`
        id,
        encrypted_content,
        iv,
        encryption_method,
        entry_date,
        word_count,
        character_count,
        is_private,
        is_shared_with_partner,
        partner_can_view,
        sentiment_score,
        mood_tags,
        relationship_themes,
        prompt_type,
        prompt_text,
        is_draft,
        version,
        created_at,
        updated_at,
        published_at
      `)
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (!includeDrafts) {
      query = query.eq('is_draft', false)
    }

    if (dateFrom) {
      query = query.gte('entry_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('entry_date', dateTo)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching journal entries:', error)
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    trackEvent('journal_entries_fetched', {
      user_id: user.id,
      entry_count: entries?.length || 0,
      include_drafts: includeDrafts
    })

    return NextResponse.json({ entries: entries || [] })

  } catch (error) {
    console.error('Journal entries GET error:', error)
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
    const validation = CreateJournalEntrySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const {
      encryptedContent,
      iv,
      encryptionMethod,
      wordCount,
      characterCount,
      isPrivate,
      isSharedWithPartner,
      partnerCanView,
      sentimentScore,
      moodTags,
      relationshipThemes,
      promptType,
      promptText,
      isDraft,
      entryDate
    } = validation.data

    // Determine entry date
    const finalEntryDate = entryDate || new Date().toISOString().split('T')[0]

    // Create journal entry
    const { data: entry, error: insertError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        encrypted_content: encryptedContent,
        iv: iv,
        encryption_method: encryptionMethod,
        entry_date: finalEntryDate,
        word_count: wordCount,
        character_count: characterCount,
        is_private: isPrivate,
        is_shared_with_partner: isSharedWithPartner,
        partner_can_view: partnerCanView,
        sentiment_score: sentimentScore,
        mood_tags: moodTags,
        relationship_themes: relationshipThemes,
        prompt_type: promptType,
        prompt_text: promptText,
        is_draft: isDraft,
        published_at: isSharedWithPartner && !isDraft ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating journal entry:', insertError)
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
    }

    // Track analytics
    trackEvent('journal_entry_created', {
      user_id: user.id,
      entry_id: entry.id,
      word_count: wordCount,
      character_count: characterCount,
      is_private: isPrivate,
      is_draft: isDraft,
      is_shared: isSharedWithPartner,
      sentiment_score: sentimentScore,
      has_mood_tags: (moodTags?.length || 0) > 0,
      prompt_type: promptType
    })

    // If sharing with partner, notify them (without content spoilers)
    if (isSharedWithPartner && !isDraft) {
      try {
        // Get partner info
        const { data: pair } = await supabase
          .from('pairs')
          .select('user_a, user_b')
          .eq('status', 'active')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .single()

        if (pair) {
          const partnerId = pair.user_a === user.id ? pair.user_b : pair.user_a
          
          // Log partner activity for notifications
          await supabase
            .from('partner_activity')
            .insert({
              user_id: user.id,
              activity_type: 'journal_shared',
              metadata: {
                entry_id: entry.id,
                partner_id: partnerId,
                word_count: wordCount,
                mood_preview: moodTags?.slice(0, 2) || []
              }
            })

          trackEvent('journal_shared_with_partner', {
            user_id: user.id,
            partner_id: partnerId,
            entry_id: entry.id
          })
        }
      } catch (error) {
        console.error('Error notifying partner:', error)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ 
      message: 'Journal entry created successfully',
      entry: {
        id: entry.id,
        entry_date: entry.entry_date,
        created_at: entry.created_at,
        is_draft: entry.is_draft,
        is_shared_with_partner: entry.is_shared_with_partner
      }
    })

  } catch (error) {
    console.error('Journal entries POST error:', error)
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
    const validation = UpdateJournalEntrySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { id, ...updateData } = validation.data

    // Check if entry exists and belongs to user
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id, version, is_shared_with_partner')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Build update object
    const updatePayload: any = {
      ...updateData,
      version: existingEntry.version + 1,
      updated_at: new Date().toISOString()
    }

    // If sharing status changed to public, set published_at
    if (updateData.isSharedWithPartner && !existingEntry.is_shared_with_partner) {
      updatePayload.published_at = new Date().toISOString()
    }

    // Update journal entry
    const { data: updatedEntry, error: updateError } = await supabase
      .from('journal_entries')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating journal entry:', updateError)
      return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
    }

    // Track analytics
    trackEvent('journal_entry_updated', {
      user_id: user.id,
      entry_id: id,
      version: updatePayload.version,
      was_shared: existingEntry.is_shared_with_partner,
      now_shared: updateData.isSharedWithPartner || existingEntry.is_shared_with_partner
    })

    return NextResponse.json({ 
      message: 'Journal entry updated successfully',
      entry: {
        id: updatedEntry.id,
        version: updatedEntry.version,
        updated_at: updatedEntry.updated_at
      }
    })

  } catch (error) {
    console.error('Journal entries PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}