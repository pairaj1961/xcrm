import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, type JWTPayload } from './auth'
import prisma from './prisma'
import type { User } from '@prisma/client'

export type AuthUser = Pick<User, 'id' | 'email' | 'role' | 'firstName' | 'lastName' | 'isActive'>

export async function requireAuth(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get('crm_token')?.value
  if (!token) return null

  const payload = verifyAccessToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
  })

  if (!user || !user.isActive) return null
  return user
}

export async function requireRole(req: NextRequest, roles: string[]): Promise<AuthUser | null> {
  const user = await requireAuth(req)
  if (!user) return null
  if (!roles.includes(user.role)) return null
  return user
}

export function repScopeFilter(user: AuthUser): { assignedToId?: string } {
  return user.role === 'REP' ? { assignedToId: user.id } : {}
}

export async function brandScopeFilter(user: AuthUser): Promise<{ brandIds: string[] }> {
  if (user.role !== 'PRODUCT_MANAGER') return { brandIds: [] }
  const assignments = await prisma.productManagerBrand.findMany({
    where: { userId: user.id },
    select: { brandId: true },
  })
  return { brandIds: assignments.map((a) => a.brandId) }
}

export async function writeAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: unknown,
  newValue?: unknown,
  ipAddress?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      ipAddress: ipAddress ?? null,
    },
  })
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function badRequest(message = 'Bad request') {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}

export function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'
}
