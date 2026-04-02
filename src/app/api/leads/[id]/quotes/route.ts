import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, unauthorized, forbidden } from '@/lib/middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  const { id: leadId } = await params

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (user.role === 'REP' && lead.assignedToId !== user.id) return forbidden()

  const quotes = await prisma.quote.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: { lineItems: true },
  })

  return NextResponse.json(quotes)
}
