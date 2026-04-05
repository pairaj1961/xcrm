import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, writeAuditLog, getIp, unauthorized, forbidden, notFound, badRequest } from '@/lib/middleware'

const lineItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  qty: z.number().int().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
})

const patchSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  notes: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
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

  const { status, lineItems, ...rest } = parsed.data

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

  // Line items can only be changed on DRAFT quotes
  if (lineItems && quote.status !== 'DRAFT') {
    return badRequest('Line items can only be edited on DRAFT quotes')
  }

  const updateData: Record<string, unknown> = { ...rest }
  if (status) updateData.status = status
  if (rest.validUntil !== undefined) updateData.validUntil = rest.validUntil ? new Date(rest.validUntil) : null
  if (status === 'ACCEPTED') updateData.approvedById = user.id

  // Recalculate totals if line items or taxRate changed
  if (lineItems) {
    const taxRate = rest.taxRate ?? quote.taxRate
    const lineItemsData = lineItems.map((item) => {
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
    updateData.subtotal = subtotal
    updateData.taxAmount = taxAmount
    updateData.total = Math.round((subtotal + taxAmount) * 100) / 100

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quoteLineItem.deleteMany({ where: { quoteId: id } })
      return tx.quote.update({
        where: { id },
        data: {
          ...updateData,
          lineItems: { create: lineItemsData },
        },
        include: {
          lineItems: { include: { product: { select: { id: true, modelName: true, sku: true } } } },
          lead: { select: { id: true, title: true, customer: { select: { companyName: true } } } },
        },
      })
    })
    await writeAuditLog(user.id, 'UPDATE', 'Quote', id, quote, updated, getIp(req))
    return NextResponse.json(updated)
  }

  // Recalculate totals if only taxRate changed
  if (rest.taxRate !== undefined) {
    const taxRate = rest.taxRate
    const taxAmount = Math.round(quote.subtotal * (taxRate / 100) * 100) / 100
    updateData.taxAmount = taxAmount
    updateData.total = Math.round((quote.subtotal + taxAmount) * 100) / 100
  }

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
