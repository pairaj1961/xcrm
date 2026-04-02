import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, requireRole, writeAuditLog, getIp, unauthorized, forbidden, notFound, badRequest } from '@/lib/middleware'

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  phone: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return forbidden()
  const { id } = await params

  const found = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      phone: true, isActive: true, createdAt: true,
      assignedBrands: { include: { brand: { select: { id: true, name: true } } } },
    },
  })
  if (!found) return notFound()
  return NextResponse.json(found)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await requireRole(req, ['ADMIN'])
  if (!authUser) return forbidden()
  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return notFound()

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const updated = await prisma.user.update({ where: { id }, data: parsed.data })
  await writeAuditLog(authUser.id, 'UPDATE', 'User', id, target, updated, getIp(req))
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await requireRole(req, ['ADMIN'])
  if (!authUser) return forbidden()
  const { id } = await params

  if (id === authUser.id) return badRequest('Cannot delete yourself')
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return notFound()

  await writeAuditLog(authUser.id, 'DELETE', 'User', id, target, null, getIp(req))
  // Soft-delete
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
