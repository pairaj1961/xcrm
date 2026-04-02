import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, requireRole, unauthorized, forbidden, badRequest } from '@/lib/middleware'

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).optional(),
})

async function getOrCreateSettings() {
  return prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  const settings = await getOrCreateSettings()
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const authUser = await requireRole(req, ['ADMIN'])
  if (!authUser) return forbidden()

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const updated = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...parsed.data },
    update: parsed.data,
  })
  return NextResponse.json(updated)
}
