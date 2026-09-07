import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
if (!supabaseAnonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}