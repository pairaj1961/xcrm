import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorized } from '@/lib/middleware'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT customer_id)::bigint AS count
      FROM rental.rental_contracts
      WHERE status = 'ACTIVE'
    `
    return NextResponse.json({ activeRentalCustomers: Number(result[0]?.count ?? 0) })
  } catch (err) {
    console.error('[rental/stats]', err)
    return NextResponse.json({ activeRentalCustomers: 0 })
  }
}
