'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { trackEvent, identifyUser, resetUser } from '@/lib/analytics'

type SupabaseContext = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      
      // Identify user for analytics if logged in
      if (user) {
        identifyUser(user.id, {
          email: user.email,
          created_at: user.created_at,
          email_confirmed: user.email_confirmed_at ? true : false
        })
        trackEvent('user_session_restored', {
          user_id: user.id,
          email_confirmed: user.email_confirmed_at ? true : false
        })
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Track auth state changes
        if (event === 'SIGNED_IN' && session?.user) {
          identifyUser(session.user.id, {
            email: session.user.email,
            created_at: session.user.created_at,
            email_confirmed: session.user.email_confirmed_at ? true : false
          })
          trackEvent('user_signed_in', {
            user_id: session.user.id,
            method: session.user.app_metadata?.provider || 'email'
          })
        } else if (event === 'SIGNED_OUT') {
          resetUser()
          trackEvent('user_signed_out')
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          trackEvent('user_token_refreshed', {
            user_id: session.user.id
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <Context.Provider value={{ supabase, user, loading }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}