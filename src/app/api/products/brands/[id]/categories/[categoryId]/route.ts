import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, brandScopeFilter, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/middleware'

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  productType: z.enum(['EQUIPMENT', 'CONSUMABLE', 'ACCESSORY']).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ id: string; categoryId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['ADMIN', 'PRODUCT_MANAGER'].includes(user.role)) return forbidden()

  const { id: brandId, categoryId } = await params

  if (user.role === 'PRODUCT_MANAGER') {
    const { brandIds } = await brandScopeFilter(user)
    if (!brandIds.includes(brandId)) return forbidden()
  }

  let body: unknown
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })

  try {
    const existing = await prisma.productCategory.findFirst({ where: { id: categoryId, brandId } })
    if (!existing) return notFound('Category not found')

    const updated = await prisma.productCategory.update({ where: { id: categoryId }, data: parsed.data })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/products/brands/[id]/categories/[categoryId]]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (user.role !== 'ADMIN') return forbidden()

  const { id: brandId, categoryId } = await params

  try {
    const existing = await prisma.productCategory.findFirst({ where: { id: categoryId, brandId } })
    if (!existing) return notFound('Category not found')

    await prisma.productCategory.delete({ where: { id: categoryId } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/products/brands/[id]/categories/[categoryId]]', err)
    return serverError()
  }
}
