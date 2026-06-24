import { NextResponse } from 'next/server'
import { getUserRole } from '../../../../lib/getUserRole'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || null

  const result = await getUserRole(token)

  if (!result.isAuthenticated) {
    return NextResponse.json({ ok: false, role: 'user' }, { status: 401 })
  }

  return NextResponse.json({ ok: true, role: result.role, userId: result.userId })
}
