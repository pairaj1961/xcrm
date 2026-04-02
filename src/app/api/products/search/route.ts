import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, brandScopeFilter, unauthorized, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const brandId = searchParams.get('brandId') ?? ''
  const type = searchParams.get('type') ?? ''

  const where: Record<string, unknown> = { isActive: true }

  // Build text search across modelName, sku, description
  if (q) {
    where.OR = [
      { modelName: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { modelNumber: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (brandId) {
    where.brandId = brandId
  }

  if (type && ['EQUIPMENT', 'CONSUMABLE', 'ACCESSORY'].includes(type)) {
    where.productType = type
  }

  // PRODUCT_MANAGER: scope to assigned brands
  if (user.role === 'PRODUCT_MANAGER') {
    const { brandIds } = await brandScopeFilter(user)
    if (brandId) {
      // Already filtered above; only allow if within scope
      if (!brandIds.includes(brandId)) {
        return NextResponse.json([])
      }
    } else {
      where.brandId = { in: brandIds }
    }
  }

  try {
    const products = await prisma.product.findMany({
      where,
      take: 30,
      orderBy: { modelName: 'asc' },
      select: {
        id: true,
        sku: true,
        modelName: true,
        modelNumber: true,
        productType: true,
        salePrice: true,
        rentalDailyRate: true,
        unit: true,
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(products)
  } catch (err) {
    console.error('[GET /api/products/search]', err)
    return serverError()
  }
}
