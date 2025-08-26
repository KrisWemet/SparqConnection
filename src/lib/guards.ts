// lib/guards.ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type AuthContext = {
  user: { id: string; email?: string | null } | null
  profile: any | null
}

export async function getAuthContext(select: string = '*'): Promise<AuthContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select(select)
    .eq('user_id', user.id)
    .single()

  return { user, profile }
}

export async function requireAuthOrRedirect(to: string = '/auth') {
  const { user } = await getAuthContext('user_id,onboarded_at,settings,time_preference')
  if (!user) redirect(to)
}

export async function requireOnboardedOrRedirect() {
  const { user, profile } = await getAuthContext('user_id,onboarded_at,settings,time_preference')
  if (!user) redirect('/auth')
  const bypass = process.env.NEXT_PUBLIC_BYPASS_ONBOARDING === '1' || process.env.NODE_ENV === 'development'
  if (!bypass && !profile?.onboarded_at) redirect('/onboarding')
}
