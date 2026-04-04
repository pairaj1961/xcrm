import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/middleware'

const updateProductSchema = z.object({
  modelName: z.string().min(1).optional(),
  modelNumber: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  productType: z.enum(['EQUIPMENT', 'CONSUMABLE', 'ACCESSORY']).optional(),
  unit: z.string().optional(),
  minimumOrderQty: z.number().int().min(1).optional(),
  salePrice: z.number().min(0).optional().nullable(),
  rentalDailyRate: z.number().min(0).optional().nullable(),
  rentalWeeklyRate: z.number().min(0).optional().nullable(),
  rentalMonthlyRate: z.number().min(0).optional().nullable(),
  serviceRatePerHour: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['ADMIN', 'PRODUCT_MANAGER'].includes(user.role)) return forbidden()

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const parsed = updateProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })

  try {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return notFound('Product not found')

    const updated = await prisma.product.update({ where: { id }, data: parsed.data })
    return NextResponse.json(updated)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
    console.error('[PATCH /api/products/items/[id]]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (user.role !== 'ADMIN') return forbidden()

  const { id } = await params

  try {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return notFound('Product not found')

    await prisma.product.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/products/items/[id]]', err)
    return serverError()
  }
}
