import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!url || !serviceRoleKey) {
  throw new Error('Supabase URL or service role key missing in environment')
}

export const supabaseAdmin = createClient(url, serviceRoleKey)
