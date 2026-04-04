import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, brandScopeFilter, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/middleware'

const createProductSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  modelName: z.string().min(1, 'Model name is required'),
  modelNumber: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  productType: z.enum(['EQUIPMENT', 'CONSUMABLE', 'ACCESSORY']),
  unit: z.string().default('piece'),
  minimumOrderQty: z.number().int().min(1).default(1),
  salePrice: z.number().min(0).optional().nullable(),
  rentalDailyRate: z.number().min(0).optional().nullable(),
  rentalWeeklyRate: z.number().min(0).optional().nullable(),
  rentalMonthlyRate: z.number().min(0).optional().nullable(),
  serviceRatePerHour: z.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['ADMIN', 'PRODUCT_MANAGER'].includes(user.role)) return forbidden()

  const { id: brandId } = await params

  if (user.role === 'PRODUCT_MANAGER') {
    const { brandIds } = await brandScopeFilter(user)
    if (!brandIds.includes(brandId)) return forbidden()
  }

  let body: unknown
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })

  try {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
    if (!brand) return notFound('Brand not found')

    const category = await prisma.productCategory.findFirst({ where: { id: parsed.data.categoryId, brandId } })
    if (!category) return notFound('Category not found in this brand')

    const product = await prisma.product.create({
      data: {
        brandId,
        categoryId: parsed.data.categoryId,
        modelName: parsed.data.modelName,
        modelNumber: parsed.data.modelNumber ?? null,
        sku: parsed.data.sku || null,
        description: parsed.data.description ?? null,
        productType: parsed.data.productType,
        unit: parsed.data.unit,
        minimumOrderQty: parsed.data.minimumOrderQty,
        salePrice: parsed.data.salePrice ?? null,
        rentalDailyRate: parsed.data.rentalDailyRate ?? null,
        rentalWeeklyRate: parsed.data.rentalWeeklyRate ?? null,
        rentalMonthlyRate: parsed.data.rentalMonthlyRate ?? null,
        serviceRatePerHour: parsed.data.serviceRatePerHour ?? null,
        isActive: parsed.data.isActive,
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
    console.error('[POST /api/products/brands/[id]/items]', err)
    return serverError()
  }
}
