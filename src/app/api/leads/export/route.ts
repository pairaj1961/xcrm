import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, repScopeFilter, unauthorized, serverError } from '@/lib/middleware'

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(fields: unknown[]): string {
  return fields.map(escapeCSV).join(',')
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
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
    if (statuses.length === 1) where.status = statuses[0]
    else if (statuses.length > 1) where.status = { in: statuses }
  }
  if (serviceLineParam) where.serviceLine = serviceLineParam
  if (priorityParam) where.priority = priorityParam
  if (assignedToIdParam && user.role !== 'REP') where.assignedToId = assignedToIdParam
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { customer: { companyName: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) createdAt.lte = new Date(dateTo)
    where.createdAt = createdAt
  }

  try {
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { companyName: true, tier: true, industry: true } },
        site: { select: { siteName: true, province: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { activities: true, quotes: true } },
      },
    })

    const headers = [
      'ID',
      'Title',
      'Status',
      'Service Line',
      'Priority',
      'Deal Value (THB)',
      'Expected Close Date',
      'Customer',
      'Customer Tier',
      'Site',
      'Province',
      'Assigned To',
      'Decision Maker',
      'Decision Maker Title',
      'Activities',
      'Quotes',
      'Created At',
      'Updated At',
    ]

    const csvRows = [
      headers.join(','),
      ...leads.map((l) =>
        row([
          l.id,
          l.title,
          l.status,
          l.serviceLine,
          l.priority,
          l.dealValue ?? '',
          l.expectedCloseDate ? l.expectedCloseDate.toISOString().split('T')[0] : '',
          l.customer.companyName,
          l.customer.tier,
          l.site?.siteName ?? '',
          l.site?.province ?? '',
          `${l.assignedTo.firstName} ${l.assignedTo.lastName}`,
          l.decisionMakerName ?? '',
          l.decisionMakerTitle ?? '',
          l._count.activities,
          l._count.quotes,
          l.createdAt.toISOString(),
          l.updatedAt.toISOString(),
        ])
      ),
    ]

    const csv = csvRows.join('\n')
    const filename = `leads-export-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/leads/export]', err)
    return serverError()
  }
}
