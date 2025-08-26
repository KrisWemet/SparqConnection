// Main supabase module exports
export { createClient } from './client'
export { createClient as createServerClient, createServiceRoleClient } from './server'

// Default export is browser client
export { default } from './client'