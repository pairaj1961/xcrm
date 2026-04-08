import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorized } from '@/lib/middleware'
import { hasRentalContract } from '@/lib/rental-bridge'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { id } = await params
  const hasContract = await hasRentalContract(id)
  return NextResponse.json({ hasContract })
}
