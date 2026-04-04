import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, brandScopeFilter, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/middleware'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  productType: z.enum(['EQUIPMENT', 'CONSUMABLE', 'ACCESSORY']),
  description: z.string().optional().nullable(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  const { id: brandId } = await params

  if (user.role === 'PRODUCT_MANAGER') {
    const { brandIds } = await brandScopeFilter(user)
    if (!brandIds.includes(brandId)) return forbidden()
  }

  try {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
    if (!brand) return notFound('Brand not found')

    const categories = await prisma.productCategory.findMany({
      where: { brandId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json(categories)
  } catch (err) {
    console.error('[GET /api/products/brands/[id]/categories]', err)
    return serverError()
  }
}

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

  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })

  try {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
    if (!brand) return notFound('Brand not found')

    const category = await prisma.productCategory.create({
      data: {
        brandId,
        name: parsed.data.name,
        productType: parsed.data.productType,
        description: parsed.data.description ?? null,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (err) {
    console.error('[POST /api/products/brands/[id]/categories]', err)
    return serverError()
  }
}
