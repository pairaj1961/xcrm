import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, brandScopeFilter, unauthorized, forbidden, badRequest, serverError } from '@/lib/middleware'

const createBrandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  countryOfOrigin: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal('')),
  logoUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['ADMIN', 'PRODUCT_MANAGER'].includes(user.role)) return forbidden()

  let body: unknown
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const parsed = createBrandSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })

  try {
    const brand = await prisma.brand.create({
      data: {
        name: parsed.data.name,
        countryOfOrigin: parsed.data.countryOfOrigin ?? null,
        description: parsed.data.description ?? null,
        websiteUrl: parsed.data.websiteUrl || null,
        logoUrl: parsed.data.logoUrl ?? null,
        isActive: parsed.data.isActive,
      },
      include: { _count: { select: { products: true, categories: true } } },
    })
    return NextResponse.json(brand, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Brand name already exists' }, { status: 409 })
    console.error('[POST /api/products]', err)
    return serverError()
  }
}

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
