import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import prisma from '@/lib/prisma'
import { requireAuth, requireRole, writeAuditLog, getIp, unauthorized, forbidden, badRequest } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']),
  phone: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return forbidden()

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(search ? { OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ] } : {}),
        ...(role ? { role } : {}),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        phone: true, isActive: true, createdAt: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        subordinates: { select: { id: true, firstName: true, lastName: true, isActive: true } },
        assignedBrands: { select: { brand: { select: { id: true, name: true } } } },
        _count: { select: { assignedLeads: true } },
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    })
    return NextResponse.json(users)
  } catch (err) {
    console.error('[GET /api/users]', err)
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authUser = await requireRole(req, ['ADMIN'])
  if (!authUser) return forbidden()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
  if (existing) return badRequest('Email already in use')

  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
  const passwordHash = await hashPassword(tempPassword)

  const newUser = await prisma.user.create({
    data: {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
    },
  })

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'xCRM <noreply@xcrm.app>',
    to: newUser.email,
    subject: 'You have been invited to xCRM',
    html: `
      <p>Hi ${newUser.firstName},</p>
      <p>You have been invited to xCRM. Log in with your email and the temporary password below:</p>
      <p><strong>Email:</strong> ${newUser.email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p><a href="${appUrl}/login">Log in to xCRM</a></p>
      <p>Please change your password after logging in.</p>
    `,
  }).catch(() => { /* email failure is non-fatal */ })

  await writeAuditLog(authUser.id, 'CREATE', 'User', newUser.id, null, newUser, getIp(req))

  return NextResponse.json({
    id: newUser.id, email: newUser.email, firstName: newUser.firstName,
    lastName: newUser.lastName, role: newUser.role, isActive: newUser.isActive,
    tempPassword,
  }, { status: 201 })
}
