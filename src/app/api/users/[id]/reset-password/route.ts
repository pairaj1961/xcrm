import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, writeAuditLog, getIp, forbidden, notFound } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await requireRole(req, ['ADMIN'])
  if (!authUser) return forbidden()
  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return notFound()

  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
  const passwordHash = await hashPassword(tempPassword)

  await prisma.user.update({
    where: { id },
    data: { passwordHash, resetToken: null, resetTokenExp: null },
  })

  await writeAuditLog(authUser.id, 'UPDATE', 'User', id, null, { passwordReset: true }, getIp(req))

  return NextResponse.json({ tempPassword })
}
