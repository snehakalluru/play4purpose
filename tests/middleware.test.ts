import { describe, it, expect, vi, beforeEach } from 'vitest'

const roleState = vi.hoisted(() => ({
  result: { isAuthenticated: false, role: 'user' as 'user' | 'admin', userId: null as string | null }
}))

vi.mock('../lib/getUserRole', () => ({
  getUserRoleFromRequest: vi.fn(async () => roleState.result)
}))

import { middleware } from '../middleware'

function makeReq(path: string) {
  return {
    nextUrl: { pathname: path },
    url: `https://example.com${path}`,
    cookies: {
      get: () => undefined,
      getAll: () => []
    }
  } as any
}

beforeEach(() => {
  roleState.result = { isAuthenticated: false, role: 'user', userId: null }
})

describe('middleware', () => {
  it('allows public paths', async () => {
    const res: any = await middleware(makeReq('/'))
    expect(res.status).toBe(200)
  })

  it('redirects unauthenticated users to login for protected paths', async () => {
    const res: any = await middleware(makeReq('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows authenticated users into the dashboard', async () => {
    roleState.result = { isAuthenticated: true, role: 'user', userId: 'user-1' }
    const res: any = await middleware(makeReq('/dashboard'))
    expect(res.status).toBe(200)
  })

  it('redirects admins from dashboard to admin', async () => {
    roleState.result = { isAuthenticated: true, role: 'admin', userId: 'admin-1' }
    const res: any = await middleware(makeReq('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin')
  })

  it('allows admin routes for admins', async () => {
    roleState.result = { isAuthenticated: true, role: 'admin', userId: 'admin-1' }
    const res: any = await middleware(makeReq('/admin'))
    expect(res.status).toBe(200)
  })

  it('denies admin routes for non-admins', async () => {
    roleState.result = { isAuthenticated: true, role: 'user', userId: 'user-1' }
    const res: any = await middleware(makeReq('/admin'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })
})
