'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft } from 'lucide-react'

const schema = z.object({ email: z.string().email('Invalid email') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSent(true)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-amber-400 font-bold text-3xl tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          xCRM
        </span>
        <p className="text-gray-500 text-sm mt-1">Reset your password</p>
      </div>

      {sent ? (
        <div className="text-center space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-green-400 text-sm">
            If that email exists, a reset link has been sent.
          </div>
          <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-100">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full bg-[#111111] border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 outline-none focus:border-amber-400/50 transition-colors"
              placeholder="you@company.com"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Send Reset Link
          </button>

          <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </form>
      )}
    </div>
  )
}
