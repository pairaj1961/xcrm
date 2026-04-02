import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  writeAuditLog,
  unauthorized,
  badRequest,
  serverError,
  getIp,
} from '@/lib/middleware'

const createCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  industry: z.enum(['CONSTRUCTION', 'INDUSTRIAL_FACTORY', 'OTHER']),
  tier: z.enum(['PROSPECT', 'ACTIVE', 'VIP', 'INACTIVE']).default('PROSPECT'),
  billingAddress: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  registrationNumber: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedRepId: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))
  const search = searchParams.get('search')?.trim() ?? ''
  const tier = searchParams.get('tier') ?? ''
  const industry = searchParams.get('industry') ?? ''

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { taxId: { contains: search } },
      { registrationNumber: { contains: search } },
    ]
  }

  if (tier && ['PROSPECT', 'ACTIVE', 'VIP', 'INACTIVE'].includes(tier)) {
    where.tier = tier
  }

  if (industry && ['CONSTRUCTION', 'INDUSTRIAL_FACTORY', 'OTHER'].includes(industry)) {
    where.industry = industry
  }

  try {
    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { companyName: 'asc' },
        include: {
          _count: { select: { leads: true, sites: true } },
        },
      }),
    ])

    return NextResponse.json({
      data: customers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('[GET /api/customers]', err)
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

  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const data = parsed.data

  try {
    const customer = await prisma.customer.create({
      data: {
        companyName: data.companyName,
        industry: data.industry,
        tier: data.tier,
        billingAddress: data.billingAddress ?? null,
        website: data.website || null,
        registrationNumber: data.registrationNumber ?? null,
        taxId: data.taxId ?? null,
        notes: data.notes ?? null,
        assignedRepId: data.assignedRepId ?? null,
      },
      include: { _count: { select: { leads: true, sites: true } } },
    })

    await writeAuditLog(user.id, 'CREATE', 'Customer', customer.id, null, customer, getIp(req))

    return NextResponse.json(customer, { status: 201 })
  } catch (err) {
    console.error('[POST /api/customers]', err)
    return serverError()
  }
}
