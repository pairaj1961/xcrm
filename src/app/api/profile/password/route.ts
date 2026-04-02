import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, unauthorized, badRequest } from '@/lib/middleware'
import { verifyPassword, hashPassword } from '@/lib/auth'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const full = await prisma.user.findUnique({ where: { id: user.id } })
  if (!full) return unauthorized()

  const valid = await verifyPassword(parsed.data.currentPassword, full.passwordHash)
  if (!valid) return badRequest('Current password is incorrect')

  const passwordHash = await hashPassword(parsed.data.newPassword)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
