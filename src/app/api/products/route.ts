import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, brandScopeFilter, unauthorized, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  try {
    const where: Record<string, unknown> = { isActive: true }

    if (user.role === 'PRODUCT_MANAGER') {
      const { brandIds } = await brandScopeFilter(user)
      where.id = { in: brandIds }
    }

    const brands = await prisma.brand.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true, categories: true },
        },
      },
    })

    return NextResponse.json(brands)
  } catch (err) {
    console.error('[GET /api/products]', err)
    return serverError()
  }
}
