import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, setAuthCookies } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('crm_refresh')?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  const payload = verifyRefreshToken(refreshToken)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, isActive: true },
  })

  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  await setAuthCookies(user)
  return NextResponse.json({ ok: true })
}
