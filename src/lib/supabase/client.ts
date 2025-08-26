// Unified Supabase client exports for browser usage
import { createClient as createBrowserClient, supabase } from '@/lib/supabase-browser'

// Export the browser client function for components
export const createClient = createBrowserClient

// Export default client singleton for direct usage
export default supabase