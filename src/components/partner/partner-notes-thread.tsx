'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { trackEvent } from '@/lib/analytics'

interface Note {
  id: string
  content: string
  visible_to_partner: boolean
  author: {
    name: string
    email: string
    is_current_user: boolean
  }
  created_at: string
  updated_at: string
}

interface PartnerNotesThreadProps {
  itemType: 'dq' | 'micro_action' | 'appreciation' | 'reflection'
  itemId: string
  className?: string
}

export default function PartnerNotesThread({ 
  itemType, 
  itemId, 
  className = '' 
}: PartnerNotesThreadProps) {
  const { user } = useSupabase()
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [shareWithPartner, setShareWithPartner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchNotes()
    }
  }, [user, itemType, itemId])

  const fetchNotes = async () => {
    try {
      const response = await fetch(
        `/api/partner/notes?item_type=${itemType}&item_id=${itemId}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }
      
      const data = await response.json()
      const itemKey = `${itemType}:${itemId}`
      const threadNotes = data.notes_by_item[itemKey] || []
      setNotes(threadNotes)
      
      // Track thread view
      trackEvent('partner_notes_thread_viewed', {
        item_type: itemType,
        notes_count: threadNotes.length,
        has_shared_notes: threadNotes.some((n: Note) => n.visible_to_partner),
        has_partner_notes: threadNotes.some((n: Note) => !n.author.is_current_user)
      })
    } catch (err) {
      console.error('Error fetching notes:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/partner/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newNote.trim(),
          item_type: itemType,
          item_id: itemId,
          visible_to_partner: shareWithPartner
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to save note')
      }

      const result = await response.json()
      setNotes(prev => [...prev, result.note])
      setNewNote('')
      const wasShared = shareWithPartner
      setShareWithPartner(false)
      
      // Track note creation
      trackEvent('partner_note_created', {
        item_type: itemType,
        content_length: newNote.trim().length,
        shared_with_partner: wasShared,
        thread_size_after: notes.length + 1
      })
      
      // Log activity if shared
      if (shareWithPartner) {
        await fetch('/api/partner/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activity_type: 'note_added',
            item_type: itemType,
            item_id: itemId,
            metadata: { shared: true }
          })
        })
      }
    } catch (err) {
      console.error('Error saving note:', err)
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleNoteSharing = async (noteId: string, currentlyShared: boolean) => {
    try {
      const response = await fetch('/api/partner/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: noteId,
          content: notes.find(n => n.id === noteId)?.content || '',
          visible_to_partner: !currentlyShared
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update note sharing')
      }

      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, visible_to_partner: !currentlyShared }
          : note
      ))
      
      // Track sharing toggle
      trackEvent('partner_note_sharing_toggled', {
        item_type: itemType,
        now_shared: !currentlyShared,
        content_length: notes.find(n => n.id === noteId)?.content?.length || 0
      })
    } catch (err) {
      console.error('Error updating note sharing:', err)
      setError('Failed to update sharing settings')
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className={`border-t pt-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border-t pt-4 ${className}`}>
      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
        <span>Our replies to this question</span>
        {notes.some(n => !n.author.is_current_user) && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Shared
          </span>
        )}
      </h4>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Existing Notes */}
      {notes.length > 0 && (
        <div className="space-y-3 mb-4">
          {notes.map((note) => (
            <div 
              key={note.id} 
              className={`p-3 rounded-lg text-sm ${
                note.author.is_current_user
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-gray-900">
                  {note.author.is_current_user ? 'You' : note.author.name}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(note.created_at)}
                  </span>
                  {note.author.is_current_user && (
                    <button
                      onClick={() => toggleNoteSharing(note.id, note.visible_to_partner)}
                      className={`text-xs px-2 py-0.5 rounded ${
                        note.visible_to_partner
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={note.visible_to_partner ? 'Shared with partner' : 'Private note'}
                    >
                      {note.visible_to_partner ? '👁️ Shared' : '🔒 Private'}
                    </button>
                  )}
                </div>
              </div>
              <div className="text-gray-700 whitespace-pre-wrap">
                {note.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Note Form */}
      <form onSubmit={handleSubmitNote} className="space-y-3">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Share your thoughts on this..."
          className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          maxLength={2000}
        />
        
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={shareWithPartner}
              onChange={(e) => setShareWithPartner(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-600">
              Share with partner
            </span>
          </label>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">
              {newNote.length}/2000
            </span>
            <button 
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className="px-4 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      </form>

      {notes.length === 0 && (
        <div className="text-sm text-gray-500 italic mt-4">
          No notes yet. Add your first thought above!
        </div>
      )}
    </div>
  )
}
