import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, writeAuditLog, getIp, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/middleware'

const updateSiteSchema = z.object({
  siteName: z.string().min(1, 'Site name is required').optional(),
  siteType: z.enum(['CONSTRUCTION_SITE', 'FACTORY', 'WAREHOUSE', 'OFFICE', 'OTHER']).optional(),
  address: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  country: z.string().optional(),
  projectStartDate: z.string().nullable().optional(),
  projectEndDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ id: string; siteId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id: customerId, siteId } = await params

  let body: unknown
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const parsed = updateSiteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const existing = await prisma.customerSite.findFirst({ where: { id: siteId, customerId } })
    if (!existing) return notFound('Site not found')

    const { projectStartDate, projectEndDate, ...rest } = parsed.data
    const updated = await prisma.customerSite.update({
      where: { id: siteId },
      data: {
        ...rest,
        ...(projectStartDate !== undefined ? { projectStartDate: projectStartDate ? new Date(projectStartDate) : null } : {}),
        ...(projectEndDate !== undefined ? { projectEndDate: projectEndDate ? new Date(projectEndDate) : null } : {}),
      },
    })
    await writeAuditLog(user.id, 'UPDATE', 'CustomerSite', siteId, existing, updated, getIp(req))
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/customers/[id]/sites/[siteId]]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (user.role !== 'ADMIN') return forbidden()

  const { id: customerId, siteId } = await params

  try {
    const existing = await prisma.customerSite.findFirst({ where: { id: siteId, customerId } })
    if (!existing) return notFound('Site not found')

    await prisma.customerSite.delete({ where: { id: siteId } })
    await writeAuditLog(user.id, 'DELETE', 'CustomerSite', siteId, existing, null, getIp(req))
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/customers/[id]/sites/[siteId]]', err)
    return serverError()
  }
}
