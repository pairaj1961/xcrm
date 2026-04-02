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

const createLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  customerId: z.string().min(1, 'Customer is required'),
  siteId: z.string().optional().nullable(),
  serviceLine: z.enum(['SALE', 'RENTAL', 'SERVICE']),
  status: z
    .enum(['NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUOTE_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD'])
    .optional()
    .default('NEW'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  dealValue: z.number().positive().optional().nullable(),
  rentalDurationDays: z.number().int().positive().optional().nullable(),
  serviceContractMonths: z.number().int().positive().optional().nullable(),
  expectedCloseDate: z.string().datetime({ offset: true }).optional().nullable(),
  decisionMakerName: z.string().max(255).optional().nullable(),
  decisionMakerTitle: z.string().max(255).optional().nullable(),
  assignedToId: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)))
  const skip = (page - 1) * pageSize

  const statusParam = searchParams.get('status')
  const serviceLineParam = searchParams.get('serviceLine')
  const priorityParam = searchParams.get('priority')
  const assignedToIdParam = searchParams.get('assignedToId')
  const search = searchParams.get('search')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const scopeFilter = repScopeFilter(user)

  const where: Record<string, unknown> = { ...scopeFilter }

  if (statusParam) {
    const statuses = statusParam.split(',').filter(Boolean)
    if (statuses.length === 1) {
      where.status = statuses[0]
    } else if (statuses.length > 1) {
      where.status = { in: statuses }
    }
  }

  if (serviceLineParam) {
    where.serviceLine = serviceLineParam
  }

  if (priorityParam) {
    where.priority = priorityParam
  }

  if (assignedToIdParam && user.role !== 'REP') {
    where.assignedToId = assignedToIdParam
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      { decisionMakerName: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) createdAt.lte = new Date(dateTo)
    where.createdAt = createdAt
  }

  try {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { companyName: true, tier: true } },
          site: { select: { siteName: true, province: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
          _count: { select: { activities: true, quotes: true } },
        },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({
      data: leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('[GET /api/leads]', err)
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

  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data

  // REP can only create leads assigned to themselves
  const assignedToId = user.role === 'REP' ? user.id : (data.assignedToId ?? user.id)

  try {
    const lead = await prisma.lead.create({
      data: {
        title: data.title,
        customerId: data.customerId,
        siteId: data.siteId ?? null,
        serviceLine: data.serviceLine,
        status: data.status,
        priority: data.priority,
        dealValue: data.dealValue ?? null,
        rentalDurationDays: data.rentalDurationDays ?? null,
        serviceContractMonths: data.serviceContractMonths ?? null,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        decisionMakerName: data.decisionMakerName ?? null,
        decisionMakerTitle: data.decisionMakerTitle ?? null,
        assignedToId,
        createdById: user.id,
        notes: data.notes ?? null,
      },
      include: {
        customer: { select: { companyName: true, tier: true } },
        site: { select: { siteName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    })

    await writeAuditLog(user.id, 'CREATE', 'Lead', lead.id, null, lead, getIp(req))

    return NextResponse.json(lead, { status: 201 })
  } catch (err) {
    console.error('[POST /api/leads]', err)
    return serverError()
  }
}
