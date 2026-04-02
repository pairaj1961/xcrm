import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, writeAuditLog, getIp, unauthorized, forbidden, notFound, badRequest } from '@/lib/middleware'

const patchSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lineItems: { include: { product: { select: { id: true, modelName: true, sku: true } } } },
      lead: {
        select: {
          id: true,
          title: true,
          assignedToId: true,
          customer: { select: { companyName: true, taxId: true, billingAddress: true } },
        },
      },
      approvedBy: { select: { firstName: true, lastName: true } },
    },
  })

  if (!quote) return notFound('Quote not found')

  // REP can only see their lead's quotes
  if (user.role === 'REP' && quote.lead.assignedToId !== user.id) return forbidden()

  return NextResponse.json(quote)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { lead: { select: { assignedToId: true } } },
  })
  if (!quote) return notFound('Quote not found')
  if (user.role === 'REP' && quote.lead.assignedToId !== user.id) return forbidden()

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const { status, ...rest } = parsed.data

  // Validate status transitions
  if (status) {
    const allowed: Record<string, string[]> = {
      DRAFT: ['SENT'],
      SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
    }
    const managerOverride = ['MANAGER', 'ADMIN'].includes(user.role)
    if (!managerOverride && !allowed[quote.status]?.includes(status)) {
      return badRequest(`Cannot transition from ${quote.status} to ${status}`)
    }
  }

  const updateData: Record<string, unknown> = { ...rest }
  if (status) updateData.status = status
  if (rest.validUntil) updateData.validUntil = new Date(rest.validUntil)
  if (status === 'ACCEPTED') updateData.approvedById = user.id

  const updated = await prisma.quote.update({ where: { id }, data: updateData })

  await writeAuditLog(user.id, 'UPDATE', 'Quote', id, quote, updated, getIp(req))
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return forbidden()
  const { id } = await params

  const quote = await prisma.quote.findUnique({ where: { id } })
  if (!quote) return notFound('Quote not found')
  if (quote.status !== 'DRAFT') return badRequest('Only DRAFT quotes can be deleted')

  await writeAuditLog(user.id, 'DELETE', 'Quote', id, quote, null, getIp(req))
  await prisma.quote.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
