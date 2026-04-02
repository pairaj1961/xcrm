'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type FormData = z.infer<typeof schema>

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: data.password }),
    })
    if (res.ok) {
      router.replace('/login')
    } else {
      const json = await res.json()
      setError(json.error ?? 'Reset failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1.5">New Password</label>
        <input type="password" {...register('password')}
          className="w-full bg-[#111111] border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-amber-400/50"
          placeholder="••••••••"
        />
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
        <input type="password" {...register('confirm')}
          className="w-full bg-[#111111] border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-amber-400/50"
          placeholder="••••••••"
        />
        {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={isSubmitting}
        className="w-full bg-amber-400 hover:bg-amber-300 text-black font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 size={14} className="animate-spin" />}
        Reset Password
      </button>
      <p className="text-center text-xs text-gray-500">
        <Link href="/login" className="text-amber-400/70 hover:text-amber-400">Back to login</Link>
      </p>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-amber-400 font-bold text-3xl tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>xCRM</span>
        <p className="text-gray-500 text-sm mt-1">Set a new password</p>
      </div>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </div>
  )
}
