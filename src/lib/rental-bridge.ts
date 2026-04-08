/**
 * rental-bridge.ts
 *
 * Server-side helpers that cross the boundary between xCRM (public schema)
 * and the Equipment Rental APP (rental schema) using shared Postgres.
 *
 * All queries use prisma.$queryRaw so Prisma doesn't need models for
 * rental tables — the raw SQL targets rental.* directly.
 */

import prisma from './prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomerRental {
  contractNumber: string
  status: string
  startDate: string | null
  endDate: string | null
  totalAmount: number
  equipmentCount: number
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * All rental contracts for a given customer (any status), newest first.
 * Matches the SQL requested in task spec.
 */
export async function getCustomerRentals(customerId: string): Promise<CustomerRental[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        contract_number: string
        status: string
        start_date: Date | null
        end_date: Date | null
        total_amount: string | null
        equipment_count: string
      }>
    >`
      SELECT
        rc.contract_number,
        rc.status,
        rc.start_date,
        rc.end_date,
        rc.total_amount,
        COUNT(rci.id)::text AS equipment_count
      FROM rental.rental_contracts rc
      LEFT JOIN rental.rental_contract_items rci ON rc.id = rci.contract_id
      WHERE rc.customer_id = ${customerId}
      GROUP BY rc.id, rc.contract_number, rc.status,
               rc.start_date, rc.end_date, rc.total_amount, rc.created_at
      ORDER BY rc.created_at DESC
    `
    return rows.map((r) => ({
      contractNumber: r.contract_number,
      status: r.status,
      startDate: r.start_date ? r.start_date.toISOString() : null,
      endDate: r.end_date ? r.end_date.toISOString() : null,
      totalAmount: r.total_amount != null ? parseFloat(r.total_amount) : 0,
      equipmentCount: parseInt(r.equipment_count, 10),
    }))
  } catch {
    // rental schema may not exist in all environments
    return []
  }
}

/**
 * Returns true if any quote on this lead has been converted into a
 * rental contract via converted_from_quote_id.
 */
export async function hasRentalContract(leadId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<[{ count: string }]>`
      SELECT COUNT(*)::text AS count
      FROM rental.rental_contracts
      WHERE converted_from_quote_id IN (
        SELECT id FROM public.quotes WHERE lead_id = ${leadId}
      )
    `
    return parseInt(rows[0]?.count ?? '0', 10) > 0
  } catch {
    return false
  }
}
