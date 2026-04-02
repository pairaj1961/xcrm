import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, requireRole, unauthorized, forbidden, badRequest } from '@/lib/middleware'

const createSchema = z.object({
  userId: z.string(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  targetType: z.enum(['REVENUE', 'LEADS_CLOSED', 'DEALS_COUNT']),
  targetValue: z.number().min(0),
  serviceLineFocus: z.enum(['SALE', 'RENTAL', 'SERVICE']).optional(),
})

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId') ?? undefined
  const period = searchParams.get('period') ?? undefined

  const filter = {
    ...(userId ? { userId } : user.role === 'REP' ? { userId: user.id } : {}),
    ...(period ? { period } : {}),
  }

  const targets = await prisma.target.findMany({
    where: filter,
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(targets)
}

export async function POST(req: NextRequest) {
  const authUser = await requireRole(req, ['MANAGER', 'ADMIN'])
  if (!authUser) return forbidden()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const target = await prisma.target.create({ data: parsed.data })
  return NextResponse.json(target, { status: 201 })
}
