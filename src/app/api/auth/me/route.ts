import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ user: full })
}
