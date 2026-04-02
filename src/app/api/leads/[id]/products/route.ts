import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  repScopeFilter,
  unauthorized,
  notFound,
  badRequest,
  serverError,
} from '@/lib/middleware'

const addProductSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  rentalDays: z.number().int().positive().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params
  const scopeFilter = repScopeFilter(user)

  try {
    const lead = await prisma.lead.findFirst({ where: { id, ...scopeFilter } })
    if (!lead) return notFound('Lead not found')

    const products = await prisma.leadProduct.findMany({
      where: { leadId: id },
      include: {
        product: {
          include: {
            brand: { select: { name: true } },
            category: { select: { name: true, productType: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(products)
  } catch (err) {
    console.error('[GET /api/leads/[id]/products]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params
  const scopeFilter = repScopeFilter(user)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = addProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const lead = await prisma.lead.findFirst({ where: { id, ...scopeFilter } })
    if (!lead) return notFound('Lead not found')

    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } })
    if (!product) return notFound('Product not found')

    const leadProduct = await prisma.leadProduct.create({
      data: {
        leadId: id,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        rentalDays: parsed.data.rentalDays ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: {
        product: {
          include: {
            brand: { select: { name: true } },
            category: { select: { name: true, productType: true } },
          },
        },
      },
    })

    return NextResponse.json(leadProduct, { status: 201 })
  } catch (err) {
    console.error('[POST /api/leads/[id]/products]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params
  const scopeFilter = repScopeFilter(user)
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')

  if (!productId) return badRequest('productId query param is required')

  try {
    const lead = await prisma.lead.findFirst({ where: { id, ...scopeFilter } })
    if (!lead) return notFound('Lead not found')

    const leadProduct = await prisma.leadProduct.findFirst({
      where: { leadId: id, productId },
    })
    if (!leadProduct) return notFound('Product not found on lead')

    await prisma.leadProduct.delete({ where: { id: leadProduct.id } })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/leads/[id]/products]', err)
    return serverError()
  }
}
