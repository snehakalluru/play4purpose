import { describe, it, expect, vi, beforeEach } from 'vitest'
import { middleware } from '../middleware'

function makeReq(path: string, token?: string) {
  return {
    nextUrl: { pathname: path },
    url: `https://example.com${path}`,
    cookies: {
      get: (name: string) => {
        if (!token) return undefined
        if (name === 'sb-access-token' || name === 'supabase-auth-token') return { value: token }
        return undefined
      }
    }
  } as any
}

beforeEach(() => {
  // reset fetch mock
  ;(global as any).fetch = vi.fn()
})

describe('middleware', () => {
  it('allows public paths', async () => {
    const res: any = await middleware(makeReq('/'))
    expect(res.status).toBe(200)
  })

  it('redirects unauthenticated to login for protected path', async () => {
    const res: any = await middleware(makeReq('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows active subscription', async () => {
    ;(global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ status: 'active' }] })
    const res: any = await middleware(makeReq('/dashboard', 'token-abc'))
    expect(res.status).toBe(200)
  })

  it('redirects to pricing when subscription inactive', async () => {
    ;(global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ status: 'canceled' }] })
    const res: any = await middleware(makeReq('/dashboard', 'token-abc'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/pricing')
  })

  it('admin route allows admin role', async () => {
    ;(global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ role: 'admin' }] })
    const res: any = await middleware(makeReq('/admin', 'token-abc'))
    expect(res.status).toBe(200)
  })

  it('admin route denies non-admin role', async () => {
    ;(global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ role: 'user' }] })
    const res: any = await middleware(makeReq('/admin', 'token-abc'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/')
  })
})
