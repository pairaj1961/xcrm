import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorized } from '@/lib/middleware'
import { getCustomerRentals } from '@/lib/rental-bridge'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params
  const rentals = await getCustomerRentals(id)
  return NextResponse.json(rentals)
}
