import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { User } from '@prisma/client'

const ACCESS_SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export interface JWTPayload {
  userId: string
  role: string
  email: string
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function setAuthCookies(user: Pick<User, 'id' | 'role' | 'email'>) {
  const cookieStore = await cookies()
  const payload: JWTPayload = { userId: user.id, role: user.role, email: user.email }

  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  const isProduction = process.env.NODE_ENV === 'production'

  cookieStore.set('crm_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60,
    path: '/',
  })

  cookieStore.set('crm_refresh', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return { accessToken, refreshToken }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete('crm_token')
  cookieStore.delete('crm_refresh')
}

export async function getTokenFromRequest(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('crm_token')?.value ?? null
}

export async function getRefreshTokenFromRequest(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('crm_refresh')?.value ?? null
}
