import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function createMissingSupabaseAdmin(): SupabaseClient {
  // Create a tolerant stub that returns rejected promises for any async call.
  const missingErr = new Error('Supabase URL or service role key missing in environment')

  const handler: ProxyHandler<any> = {
    get() {
      // Return another proxy so chained property access doesn't throw synchronously
      return new Proxy(() => Promise.reject(missingErr), handler)
    },
    apply() {
      return Promise.reject(missingErr)
    }
  }

  return new Proxy(() => Promise.reject(missingErr), handler) as SupabaseClient
}

// If envs are present, create a real admin client.
export const supabaseAdmin: SupabaseClient =
  url && serviceRoleKey ? createClient(url, serviceRoleKey) : createMissingSupabaseAdmin()
