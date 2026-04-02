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

const tagSchema = z.object({
  tagId: z.string().min(1),
})

type RouteParams = { params: Promise<{ id: string }> }

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

  const parsed = tagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const lead = await prisma.lead.findFirst({ where: { id, ...scopeFilter } })
    if (!lead) return notFound('Lead not found')

    const tag = await prisma.tag.findUnique({ where: { id: parsed.data.tagId } })
    if (!tag) return notFound('Tag not found')

    const leadTag = await prisma.leadTag.upsert({
      where: { leadId_tagId: { leadId: id, tagId: parsed.data.tagId } },
      create: { leadId: id, tagId: parsed.data.tagId },
      update: {},
      include: { tag: true },
    })

    return NextResponse.json(leadTag, { status: 201 })
  } catch (err) {
    console.error('[POST /api/leads/[id]/tags]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params
  const scopeFilter = repScopeFilter(user)
  const { searchParams } = new URL(req.url)
  const tagId = searchParams.get('tagId')

  if (!tagId) return badRequest('tagId query param is required')

  try {
    const lead = await prisma.lead.findFirst({ where: { id, ...scopeFilter } })
    if (!lead) return notFound('Lead not found')

    await prisma.leadTag.deleteMany({ where: { leadId: id, tagId } })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/leads/[id]/tags]', err)
    return serverError()
  }
}
