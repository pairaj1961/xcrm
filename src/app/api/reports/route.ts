import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, repScopeFilter, brandScopeFilter, unauthorized } from '@/lib/middleware'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths, parseISO } from 'date-fns'

function getDateRange(period: string, dateFrom?: string, dateTo?: string, quarter?: string) {
  if (dateFrom && dateTo) {
    return { gte: parseISO(dateFrom), lte: parseISO(dateTo) }
  }
  const now = new Date()
  if (period === 'last_month') {
    const last = subMonths(now, 1)
    return { gte: startOfMonth(last), lte: endOfMonth(last) }
  }
  if (period === 'this_quarter') {
    return { gte: startOfQuarter(now), lte: endOfQuarter(now) }
  }
  // Default: this month
  return { gte: startOfMonth(now), lte: endOfMonth(now) }
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'pipeline'
  const period = searchParams.get('period') ?? 'this_month'
  const dateFrom = searchParams.get('dateFrom') ?? undefined
  const dateTo = searchParams.get('dateTo') ?? undefined

  const dateRange = getDateRange(period, dateFrom, dateTo)
  const repFilter = repScopeFilter(user)

  if (type === 'pipeline') {
    const baseFilter = { ...repFilter, createdAt: dateRange }

    const [byStatus, byServiceLine, byRep] = await Promise.all([
      prisma.lead.groupBy({
        by: ['status'],
        where: baseFilter,
        _count: { id: true },
        _sum: { dealValue: true },
      }),
      prisma.lead.groupBy({
        by: ['serviceLine'],
        where: baseFilter,
        _count: { id: true },
        _sum: { dealValue: true },
      }),
      ['MANAGER', 'ADMIN'].includes(user.role)
        ? prisma.lead.groupBy({
            by: ['assignedToId'],
            where: { createdAt: dateRange },
            _count: { id: true },
            _sum: { dealValue: true },
          })
        : Promise.resolve([]),
    ])

    // Enrich rep data with names
    let byRepEnriched: unknown[] = []
    if (Array.isArray(byRep) && byRep.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: (byRep as { assignedToId: string }[]).map((r) => r.assignedToId) } },
        select: { id: true, firstName: true, lastName: true },
      })
      byRepEnriched = (byRep as { assignedToId: string; _count: { id: number }; _sum: { dealValue: number | null } }[]).map((r) => ({
        ...r,
        repName: users.find((u) => u.id === r.assignedToId)
          ? `${users.find((u) => u.id === r.assignedToId)!.firstName} ${users.find((u) => u.id === r.assignedToId)!.lastName}`
          : 'Unknown',
      }))
    }

    return NextResponse.json({ byStatus, byServiceLine, byRep: byRepEnriched })
  }

  if (type === 'performance') {
    const reps = await prisma.user.findMany({
      where: { role: 'REP', isActive: true, ...(user.role === 'REP' ? { id: user.id } : {}) },
      select: {
        id: true, firstName: true, lastName: true,
        targets: { where: { period: { contains: String(new Date().getFullYear()) }, targetType: 'REVENUE' } },
        assignedLeads: {
          where: { updatedAt: dateRange },
          select: { status: true, dealValue: true },
        },
      },
    })

    const data = reps.map((rep) => {
      const won = rep.assignedLeads.filter((l) => l.status === 'CLOSED_WON')
      const lost = rep.assignedLeads.filter((l) => l.status === 'CLOSED_LOST')
      const total = won.length + lost.length
      const revenue = won.reduce((s, l) => s + (l.dealValue ?? 0), 0)
      const target = rep.targets.reduce((s, t) => s + t.targetValue, 0)
      return {
        id: rep.id,
        name: `${rep.firstName} ${rep.lastName}`,
        wonDeals: won.length,
        lostDeals: lost.length,
        winRate: total > 0 ? (won.length / total) * 100 : 0,
        revenue,
        target,
        attainment: target > 0 ? (revenue / target) * 100 : 0,
      }
    })

    return NextResponse.json({ data })
  }

  if (type === 'brands') {
    if (!['PRODUCT_MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { brandIds } = await brandScopeFilter(user)
    const filter = user.role === 'PRODUCT_MANAGER' ? { id: { in: brandIds } } : {}

    const brands = await prisma.brand.findMany({
      where: filter,
      select: {
        id: true, name: true,
        products: {
          select: {
            leadProducts: {
              where: { lead: { createdAt: dateRange } },
              select: { leadId: true, unitPrice: true, quantity: true },
            },
            quoteLineItems: {
              where: { quote: { createdAt: dateRange } },
              select: { subtotal: true },
            },
          },
        },
      },
    })

    const data = brands.map((b) => {
      const leadIds = new Set(b.products.flatMap((p) => p.leadProducts.map((lp) => lp.leadId)))
      const quoteRevenue = b.products.flatMap((p) => p.quoteLineItems).reduce((s, li) => s + li.subtotal, 0)
      return { id: b.id, name: b.name, leadCount: leadIds.size, quoteRevenue }
    })

    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
}
