import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireRole, writeAuditLog, getIp, forbidden, notFound, badRequest } from '@/lib/middleware'

const schema = z.object({ brandIds: z.array(z.string()) })

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await requireRole(req, ['ADMIN'])
  if (!authUser) return forbidden()
  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return notFound()
  if (target.role !== 'PRODUCT_MANAGER') return badRequest('User must be a PRODUCT_MANAGER')

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const { brandIds } = parsed.data

  // Replace all assignments
  await prisma.productManagerBrand.deleteMany({ where: { userId: id } })
  if (brandIds.length > 0) {
    await prisma.productManagerBrand.createMany({
      data: brandIds.map((brandId) => ({ userId: id, brandId })),
    })
  }

  await writeAuditLog(authUser.id, 'UPDATE', 'ProductManagerBrand', id, null, { brandIds }, getIp(req))

  const updated = await prisma.productManagerBrand.findMany({
    where: { userId: id },
    include: { brand: { select: { id: true, name: true } } },
  })
  return NextResponse.json(updated)
}
