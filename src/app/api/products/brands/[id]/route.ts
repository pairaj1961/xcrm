import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  brandScopeFilter,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/middleware'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params

  // PRODUCT_MANAGER: check brand is in their scope
  if (user.role === 'PRODUCT_MANAGER') {
    const { brandIds } = await brandScopeFilter(user)
    if (!brandIds.includes(id)) return forbidden()
  }

  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            products: {
              where: { isActive: true },
              orderBy: { modelName: 'asc' },
              select: {
                id: true,
                sku: true,
                modelName: true,
                modelNumber: true,
                description: true,
                productType: true,
                salePrice: true,
                rentalDailyRate: true,
                rentalWeeklyRate: true,
                rentalMonthlyRate: true,
                serviceRatePerHour: true,
                unit: true,
                minimumOrderQty: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: { products: true, categories: true },
        },
      },
    })

    if (!brand) return notFound('Brand not found')

    return NextResponse.json(brand)
  } catch (err) {
    console.error('[GET /api/products/brands/[id]]', err)
    return serverError()
  }
}
