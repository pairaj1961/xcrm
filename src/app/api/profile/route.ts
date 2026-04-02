import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, unauthorized, badRequest } from '@/lib/middleware'

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, phone: true, avatarUrl: true, isActive: true, createdAt: true,
    },
  })
  return NextResponse.json(profile)
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, phone: true, avatarUrl: true, isActive: true,
    },
  })
  return NextResponse.json(updated)
}
