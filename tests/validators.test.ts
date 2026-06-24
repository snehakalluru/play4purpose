import { describe, it, expect } from 'vitest'
import { registrationSchema } from '../validators/auth'
import { scoreSchema } from '../validators/score'

describe('validators', () => {
  it('registration valid', () => {
    const res = registrationSchema.safeParse({
      email: 'a@b.com',
      password: 'password123',
      full_name: 'Jane Doe',
      charity_id: '00000000-0000-4000-8000-000000000000',
      contribution_percentage: 10,
      terms_accepted: true,
      privacy_accepted: true
    })
    expect(res.success).toBe(true)
  })

  it('score valid range', () => {
    const ok = scoreSchema.safeParse({ score: 18, score_date: new Date().toISOString() })
    expect(ok.success).toBe(true)
    const bad = scoreSchema.safeParse({ score: 100, score_date: new Date().toISOString() })
    expect(bad.success).toBe(false)
  })
})
