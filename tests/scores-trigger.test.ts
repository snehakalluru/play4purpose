import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'

// Integration test: requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  describe.skip('DB trigger: keep_latest_five_scores (integration)', () => {
    it('skipped - set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run this test', () => {})
  })
} else {
  // lazy import supabaseAdmin only when envs exist
  const { supabaseAdmin } = require('../services/supabaseAdmin')

  describe('DB trigger: keep_latest_five_scores', () => {
    it('keeps only latest 5 scores per user', async () => {
      const userId = uuidv4()

      // create profile
      const { error: pErr } = await supabaseAdmin.from('profiles').insert({ id: userId, email: `${userId}@test.local`, full_name: 'Test User' })
      if (pErr) throw pErr

      // insert 7 scores with decreasing dates (newest first)
      const now = new Date()
      for (let i = 0; i < 7; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const score_date = d.toISOString().slice(0, 10)
        const { error } = await supabaseAdmin.from('scores').insert({ user_id: userId, score: 10 + i, score_date })
        if (error) throw error
      }

      // fetch scores ordered descending
      const { data: rows, error: fetchErr } = await supabaseAdmin.from('scores').select('score, score_date, created_at').eq('user_id', userId).order('score_date', { ascending: false })
      if (fetchErr) throw fetchErr

      expect(rows.length).toBeLessThanOrEqual(5)
      expect(rows.length).toBe(5)

      // newest should be first
      const dates = rows.map((r: any) => r.score_date)
      for (let i = 0; i < dates.length - 1; i++) {
        expect(new Date(dates[i]) >= new Date(dates[i + 1])).toBeTruthy()
      }

      // cleanup
      await supabaseAdmin.from('scores').delete().eq('user_id', userId)
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
    }, 20000)
  })
}
