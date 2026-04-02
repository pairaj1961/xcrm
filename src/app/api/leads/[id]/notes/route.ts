import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  repScopeFilter,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from '@/lib/middleware'

const createNoteSchema = z.object({
  content: z.string().min(1).max(2000),
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

    const notes = await prisma.productNote.findMany({
      where: { leadId: id },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notes)
  } catch (err) {
    console.error('[GET /api/leads/[id]/notes]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  // Only PRODUCT_MANAGER (and ADMIN) can create product notes
  if (!['PRODUCT_MANAGER', 'ADMIN'].includes(user.role)) return forbidden()

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = createNoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return notFound('Lead not found')

    const note = await prisma.productNote.create({
      data: {
        leadId: id,
        authorId: user.id,
        content: parsed.data.content,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (err) {
    console.error('[POST /api/leads/[id]/notes]', err)
    return serverError()
  }
}
