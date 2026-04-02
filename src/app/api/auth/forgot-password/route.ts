import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import prisma from '@/lib/prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  // Always return success to prevent email enumeration
  if (!user) return NextResponse.json({ ok: true })

  const token = randomBytes(32).toString('hex')
  const exp = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExp: exp },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  await resend.emails.send({
    from: 'xCRM <noreply@xcrm.app>',
    to: user.email,
    subject: 'Reset your xCRM password',
    html: `
      <p>Hi ${user.firstName},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  })

  return NextResponse.json({ ok: true })
}
