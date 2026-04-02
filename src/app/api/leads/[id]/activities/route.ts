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

const createActivitySchema = z.object({
  type: z.enum([
    'CALL',
    'EMAIL',
    'SITE_VISIT',
    'DEMO',
    'QUOTE_SENT',
    'MEETING',
    'NOTE',
    'TASK',
    'REPAIR_VISIT',
    'MAINTENANCE_CHECK',
    'CALIBRATION',
  ]),
  subject: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  completedAt: z.string().datetime({ offset: true }).optional().nullable(),
  outcome: z.string().max(500).optional().nullable(),
  followUpDate: z.string().datetime({ offset: true }).optional().nullable(),
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

    const activities = await prisma.activity.findMany({
      where: { leadId: id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(activities)
  } catch (err) {
    console.error('[GET /api/leads/[id]/activities]', err)
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

  const parsed = createActivitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const lead = await prisma.lead.findFirst({ where: { id, ...scopeFilter } })
    if (!lead) return notFound('Lead not found')

    const data = parsed.data
    const activity = await prisma.activity.create({
      data: {
        leadId: id,
        userId: user.id,
        type: data.type,
        subject: data.subject,
        description: data.description ?? null,
        location: data.location ?? null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        outcome: data.outcome ?? null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (err) {
    console.error('[POST /api/leads/[id]/activities]', err)
    return serverError()
  }
}
