import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  repScopeFilter,
  writeAuditLog,
  getIp,
  unauthorized,
  badRequest,
  serverError,
} from '@/lib/middleware'

const lineItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  discount: z.number().min(0).max(100).default(0),
})

const createQuoteSchema = z.object({
  leadId: z.string().min(1, 'Lead is required'),
  notes: z.string().optional().nullable(),
  validUntil: z.string().datetime({ offset: true }).optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
})

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `QT-${year}-`

  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  })

  let seq = 1
  if (last) {
    const parts = last.quoteNumber.split('-')
    const lastSeq = parseInt(parts[2] ?? '0', 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  return `${prefix}${String(seq).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)))
  const skip = (page - 1) * pageSize

  const statusParam = searchParams.get('status')
  const leadIdParam = searchParams.get('leadId')
  const search = searchParams.get('search')

  // For REPs: only show quotes on their assigned leads
  const scopeFilter = repScopeFilter(user)

  const where: Record<string, unknown> = {}

  if (Object.keys(scopeFilter).length > 0) {
    where.lead = { assignedToId: scopeFilter.assignedToId }
  }

  if (statusParam) {
    where.status = statusParam
  }

  if (leadIdParam) {
    where.leadId = leadIdParam
  }

  if (search) {
    where.OR = [
      { quoteNumber: { contains: search, mode: 'insensitive' } },
      { lead: { title: { contains: search, mode: 'insensitive' } } },
      { lead: { customer: { companyName: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  try {
    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: {
              id: true,
              title: true,
              customer: { select: { companyName: true } },
            },
          },
          _count: { select: { lineItems: true } },
        },
      }),
      prisma.quote.count({ where }),
    ])

    return NextResponse.json({
      data: quotes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('[GET /api/quotes]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = createQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data

  try {
    // Verify lead exists and user can access it
    const scopeFilter = repScopeFilter(user)
    const leadWhere: Record<string, unknown> = { id: data.leadId, ...scopeFilter }
    const lead = await prisma.lead.findFirst({ where: leadWhere, select: { id: true } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    // Fetch settings for default taxRate
    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })
    const taxRate = data.taxRate ?? settings?.taxRate ?? 7

    // Compute totals
    const lineItemsData = data.lineItems.map((item) => {
      const lineSubtotal = item.qty * item.unitPrice * (1 - item.discount / 100)
      return {
        productId: item.productId ?? null,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: Math.round(lineSubtotal * 100) / 100,
      }
    })

    const subtotal = lineItemsData.reduce((sum, li) => sum + li.subtotal, 0)
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

    const quoteNumber = await generateQuoteNumber()

    const quote = await prisma.quote.create({
      data: {
        leadId: data.leadId,
        quoteNumber,
        status: 'DRAFT',
        subtotal,
        taxRate,
        taxAmount,
        discount: 0,
        total,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes ?? null,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        lineItems: {
          include: { product: { select: { id: true, modelName: true, sku: true } } },
        },
        lead: {
          select: {
            id: true,
            title: true,
            customer: { select: { companyName: true } },
          },
        },
      },
    })

    await writeAuditLog(user.id, 'CREATE', 'Quote', quote.id, null, quote, getIp(req))

    return NextResponse.json(quote, { status: 201 })
  } catch (err) {
    console.error('[POST /api/quotes]', err)
    return serverError()
  }
}
