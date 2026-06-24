import { NextResponse } from 'next/server'
import { getUserRole } from './getUserRole'

function readBearerToken(req?: Request): string | null {
  const authHeader = req?.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length)
}

export async function requireAdmin(req?: Request) {
  const { isAuthenticated, role, userId } = await getUserRole(readBearerToken(req) ?? undefined)

  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  if (role !== 'admin' || !userId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  return userId
}
