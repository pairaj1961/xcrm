import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  repScopeFilter,
  writeAuditLog,
  getIp,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from '@/lib/middleware'

const patchLeadSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  customerId: z.string().optional(),
  siteId: z.string().nullable().optional(),
  serviceLine: z.enum(['SALE', 'RENTAL', 'SERVICE']).optional(),
  status: z
    .enum(['NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUOTE_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dealValue: z.number().positive().nullable().optional(),
  rentalDurationDays: z.number().int().positive().nullable().optional(),
  serviceContractMonths: z.number().int().positive().nullable().optional(),
  expectedCloseDate: z.string().datetime({ offset: true }).nullable().optional(),
  lostReason: z.string().max(500).nullable().optional(),
  lostToCompetitor: z.string().max(255).nullable().optional(),
  decisionMakerName: z.string().max(255).nullable().optional(),
  decisionMakerTitle: z.string().max(255).nullable().optional(),
  assignedToId: z.string().optional(),
  notes: z.string().nullable().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params
  const scopeFilter = repScopeFilter(user)

  try {
    const lead = await prisma.lead.findFirst({
      where: { id, ...scopeFilter },
      include: {
        customer: true,
        site: {
          include: { contacts: true },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        products: {
          include: {
            product: {
              include: { brand: { select: { name: true } }, category: { select: { name: true } } },
            },
          },
          orderBy: { id: 'asc' },
        },
        activities: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          include: { lineItems: { include: { product: { select: { id: true, modelName: true, sku: true } } } } },
          orderBy: { createdAt: 'desc' },
        },
        productNotes: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tags: {
          include: { tag: true },
        },
      },
    })

    if (!lead) return notFound('Lead not found')

    return NextResponse.json(lead)
  } catch (err) {
    console.error('[GET /api/leads/[id]]', err)
    return serverError()
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

  const parsed = patchLeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const existing = await prisma.lead.findFirst({ where: { id, ...scopeFilter } })
    if (!existing) return notFound('Lead not found')

    // REP cannot reassign leads
    if (user.role === 'REP' && parsed.data.assignedToId && parsed.data.assignedToId !== user.id) {
      return forbidden()
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.customerId !== undefined) updateData.customerId = data.customerId
    if (data.siteId !== undefined) updateData.siteId = data.siteId
    if (data.serviceLine !== undefined) updateData.serviceLine = data.serviceLine
    if (data.status !== undefined) updateData.status = data.status
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.dealValue !== undefined) updateData.dealValue = data.dealValue
    if (data.rentalDurationDays !== undefined) updateData.rentalDurationDays = data.rentalDurationDays
    if (data.serviceContractMonths !== undefined) updateData.serviceContractMonths = data.serviceContractMonths
    if (data.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate) : null
    }
    if (data.lostReason !== undefined) updateData.lostReason = data.lostReason
    if (data.lostToCompetitor !== undefined) updateData.lostToCompetitor = data.lostToCompetitor
    if (data.decisionMakerName !== undefined) updateData.decisionMakerName = data.decisionMakerName
    if (data.decisionMakerTitle !== undefined) updateData.decisionMakerTitle = data.decisionMakerTitle
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId
    if (data.notes !== undefined) updateData.notes = data.notes

    const updated = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { companyName: true, tier: true } },
        site: { select: { siteName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    })

    await writeAuditLog(user.id, 'UPDATE', 'Lead', id, existing, updated, getIp(req))

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/leads/[id]]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  if (!['MANAGER', 'ADMIN'].includes(user.role)) return forbidden()

  const { id } = await params

  try {
    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return notFound('Lead not found')

    await writeAuditLog(user.id, 'DELETE', 'Lead', id, existing, null, getIp(req))

    await prisma.lead.delete({ where: { id } })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/leads/[id]]', err)
    return serverError()
  }
}
