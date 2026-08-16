import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://nvuvyebrbnoldtimkozb.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_EmfKUviMXVqMh3EhiIPD4g_GnOqQlos'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)