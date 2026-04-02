import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  writeAuditLog,
  unauthorized,
  notFound,
  badRequest,
  serverError,
  getIp,
} from '@/lib/middleware'

const createSiteSchema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  siteType: z.enum(['CONSTRUCTION_SITE', 'FACTORY', 'WAREHOUSE', 'OFFICE', 'OTHER']),
  address: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  country: z.string().default('Thailand'),
  projectStartDate: z.string().datetime({ offset: true }).optional().nullable(),
  projectEndDate: z.string().datetime({ offset: true }).optional().nullable(),
  isActive: z.boolean().default(true),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1),
        title: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal('')),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id: customerId } = await params

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } })
    if (!customer) return notFound('Customer not found')

    const sites = await prisma.customerSite.findMany({
      where: { customerId },
      orderBy: { siteName: 'asc' },
      include: {
        contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      },
    })

    return NextResponse.json(sites)
  } catch (err) {
    console.error('[GET /api/customers/[id]/sites]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id: customerId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = createSiteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } })
    if (!customer) return notFound('Customer not found')

    const { contacts, ...siteData } = parsed.data

    const site = await prisma.customerSite.create({
      data: {
        customerId,
        siteName: siteData.siteName,
        siteType: siteData.siteType,
        address: siteData.address ?? null,
        province: siteData.province ?? null,
        country: siteData.country,
        projectStartDate: siteData.projectStartDate ? new Date(siteData.projectStartDate) : null,
        projectEndDate: siteData.projectEndDate ? new Date(siteData.projectEndDate) : null,
        isActive: siteData.isActive,
        contacts: contacts
          ? {
              create: contacts.map((c) => ({
                name: c.name,
                title: c.title ?? null,
                phone: c.phone ?? null,
                email: c.email || null,
                isPrimary: c.isPrimary,
              })),
            }
          : undefined,
      },
      include: {
        contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      },
    })

    await writeAuditLog(user.id, 'CREATE', 'CustomerSite', site.id, null, site, getIp(req))

    return NextResponse.json(site, { status: 201 })
  } catch (err) {
    console.error('[POST /api/customers/[id]/sites]', err)
    return serverError()
  }
}
