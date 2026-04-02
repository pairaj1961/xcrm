import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  requireAuth,
  writeAuditLog,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
  getIp,
} from '@/lib/middleware'

const updateCustomerSchema = z.object({
  companyName: z.string().min(1).optional(),
  industry: z.enum(['CONSTRUCTION', 'INDUSTRIAL_FACTORY', 'OTHER']).optional(),
  tier: z.enum(['PROSPECT', 'ACTIVE', 'VIP', 'INACTIVE']).optional(),
  billingAddress: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  registrationNumber: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedRepId: z.string().optional().nullable(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sites: {
          where: { isActive: true },
          orderBy: { siteName: 'asc' },
          include: {
            contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
          },
        },
        leads: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
          include: {
            assignedTo: { select: { firstName: true, lastName: true } },
          },
        },
        _count: { select: { leads: true, sites: true } },
      },
    })

    if (!customer) return notFound('Customer not found')

    return NextResponse.json(customer)
  } catch (err) {
    console.error('[GET /api/customers/[id]]', err)
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = updateCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) return notFound('Customer not found')

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        website: parsed.data.website || null,
      },
      include: { _count: { select: { leads: true, sites: true } } },
    })

    await writeAuditLog(user.id, 'UPDATE', 'Customer', id, existing, updated, getIp(req))

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/customers/[id]]', err)
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  if (user.role !== 'ADMIN') return forbidden()

  const { id } = await params

  try {
    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) return notFound('Customer not found')

    await prisma.customer.delete({ where: { id } })

    await writeAuditLog(user.id, 'DELETE', 'Customer', id, existing, null, getIp(req))

    return NextResponse.json({ message: 'Customer deleted' })
  } catch (err) {
    console.error('[DELETE /api/customers/[id]]', err)
    return serverError()
  }
}
