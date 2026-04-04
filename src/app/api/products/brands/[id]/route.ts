import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  brandScopeFilter,
  writeAuditLog,
  getIp,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from '@/lib/middleware'

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  countryOfOrigin: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal('')),
  logoUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

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

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['ADMIN', 'PRODUCT_MANAGER'].includes(user.role)) return forbidden()

  const { id } = await params

  if (user.role === 'PRODUCT_MANAGER') {
    const { brandIds } = await brandScopeFilter(user)
    if (!brandIds.includes(id)) return forbidden()
  }

  let body: unknown
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const parsed = updateBrandSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })

  try {
    const existing = await prisma.brand.findUnique({ where: { id } })
    if (!existing) return notFound('Brand not found')

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...parsed.data,
        websiteUrl: parsed.data.websiteUrl || null,
      },
    })
    await writeAuditLog(user.id, 'UPDATE', 'Product', id, existing, updated, getIp(req))
    return NextResponse.json(updated)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Brand name already exists' }, { status: 409 })
    console.error('[PATCH /api/products/brands/[id]]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (user.role !== 'ADMIN') return forbidden()

  const { id } = await params

  try {
    const existing = await prisma.brand.findUnique({ where: { id } })
    if (!existing) return notFound('Brand not found')

    await writeAuditLog(user.id, 'DELETE', 'Product', id, existing, null, getIp(req))
    await prisma.brand.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/products/brands/[id]]', err)
    return serverError()
  }
}
