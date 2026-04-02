import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, repScopeFilter, brandScopeFilter } from '@/lib/middleware'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, startOfDay, addDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const prevMonthStart = startOfMonth(subMonths(now, 1))
  const prevMonthEnd = endOfMonth(subMonths(now, 1))

  if (user.role === 'REP') {
    const repFilter = { assignedToId: user.id }

    const [openLeads, pipelineAgg, activitiesThisWeek, wonThisMonth, staleLeads, upcoming] = await Promise.all([
      prisma.lead.count({ where: { ...repFilter, status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } } }),
      prisma.lead.aggregate({ where: { ...repFilter, status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } }, _sum: { dealValue: true } }),
      prisma.activity.count({ where: { userId: user.id, scheduledAt: { gte: startOfDay(now), lte: addDays(startOfDay(now), 7) } } }),
      prisma.lead.aggregate({ where: { ...repFilter, status: 'CLOSED_WON', updatedAt: { gte: monthStart, lte: monthEnd } }, _sum: { dealValue: true } }),
      prisma.lead.findMany({
        where: { ...repFilter, status: { notIn: ['CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD'] }, updatedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
        take: 5,
        orderBy: { updatedAt: 'asc' },
        include: { customer: { select: { companyName: true } } },
      }),
      prisma.activity.findMany({
        where: { userId: user.id, scheduledAt: { gte: now, lte: addDays(now, 7) }, completedAt: null },
        take: 5,
        orderBy: { scheduledAt: 'asc' },
        include: { lead: { select: { title: true, customer: { select: { companyName: true } } } } },
      }),
    ])

    return NextResponse.json({
      role: 'REP',
      kpis: {
        openLeads,
        pipelineValue: pipelineAgg._sum.dealValue ?? 0,
        activitiesThisWeek,
        wonThisMonth: wonThisMonth._sum.dealValue ?? 0,
      },
      staleLeads,
      upcoming,
    })
  }

  if (user.role === 'MANAGER') {
    const [totalPipeline, wonThisMonth, wonLastMonth, overdueFollowUps, teamPerformance, pipelineByStatus] = await Promise.all([
      prisma.lead.aggregate({ where: { status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } }, _sum: { dealValue: true } }),
      prisma.lead.aggregate({ where: { status: 'CLOSED_WON', updatedAt: { gte: monthStart, lte: monthEnd } }, _sum: { dealValue: true }, _count: true }),
      prisma.lead.aggregate({ where: { status: 'CLOSED_WON', updatedAt: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { dealValue: true }, _count: true }),
      prisma.activity.count({ where: { followUpDate: { lt: now }, completedAt: null } }),
      prisma.user.findMany({
        where: { role: 'REP', isActive: true },
        select: {
          id: true, firstName: true, lastName: true,
          assignedLeads: {
            where: { status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
            select: { dealValue: true, status: true },
          },
        },
      }),
      prisma.lead.groupBy({ by: ['status'], _count: { id: true }, _sum: { dealValue: true } }),
    ])

    const totalLeads = await prisma.lead.count()
    const wonLeads = await prisma.lead.count({ where: { status: 'CLOSED_WON' } })
    const winRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0

    return NextResponse.json({
      role: 'MANAGER',
      kpis: {
        totalPipeline: totalPipeline._sum.dealValue ?? 0,
        winRate,
        overdueFollowUps,
        wonThisMonth: wonThisMonth._sum.dealValue ?? 0,
      },
      teamPerformance: teamPerformance.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        openLeads: u.assignedLeads.length,
        pipelineValue: u.assignedLeads.reduce((s, l) => s + (l.dealValue ?? 0), 0),
      })),
      pipelineByStatus,
    })
  }

  if (user.role === 'PRODUCT_MANAGER') {
    const { brandIds } = await brandScopeFilter(user)

    const [brandStats, recentNotes, topProducts] = await Promise.all([
      prisma.brand.findMany({
        where: { id: { in: brandIds } },
        select: {
          id: true, name: true,
          products: {
            select: {
              leadProducts: { select: { leadId: true } },
              quoteLineItems: { select: { subtotal: true } },
            },
          },
        },
      }),
      prisma.productNote.findMany({
        where: { author: { assignedBrands: { some: { brandId: { in: brandIds } } } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { firstName: true, lastName: true } }, lead: { select: { title: true } } },
      }),
      prisma.leadProduct.groupBy({
        by: ['productId'],
        _count: { leadId: true },
        where: { product: { brandId: { in: brandIds } } },
        orderBy: { _count: { leadId: 'desc' } },
        take: 5,
      }),
    ])

    return NextResponse.json({ role: 'PRODUCT_MANAGER', brandStats, recentNotes, topProducts })
  }

  // ADMIN
  const [totalUsers, totalCustomers, activeLeads, revenueAgg, recentAudit] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.customer.count(),
    prisma.lead.count({ where: { status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } } }),
    prisma.lead.aggregate({ where: { status: 'CLOSED_WON', updatedAt: { gte: monthStart } }, _sum: { dealValue: true } }),
    prisma.auditLog.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { firstName: true, lastName: true } } } }),
  ])

  return NextResponse.json({
    role: 'ADMIN',
    kpis: { totalUsers, totalCustomers, activeLeads, revenueMTD: revenueAgg._sum.dealValue ?? 0 },
    recentAudit,
  })
}
