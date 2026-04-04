'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { apiPost } from '@/lib/apiClient'
import type { Brand } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  countryOfOrigin: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  logoUrl: z.string().optional(),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof schema>

function fieldClass() {
  return 'w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50'
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

export default function NewBrandPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true },
  })

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const brand = await apiPost<Brand>('/api/products', {
        name: data.name,
        countryOfOrigin: data.countryOfOrigin || null,
        description: data.description || null,
        websiteUrl: data.websiteUrl || null,
        logoUrl: data.logoUrl || null,
        isActive: data.isActive,
      })
      router.push(`/products/brands/${brand.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create brand')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/products')} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">New Brand</h1>
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Brand Name <span className="text-red-400">*</span>
          </label>
          <input {...register('name')} placeholder="e.g. Makita" className={fieldClass()} />
          <FieldError message={errors.name?.message} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Country of Origin</label>
          <input {...register('countryOfOrigin')} placeholder="e.g. Japan" className={fieldClass()} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Brief description of the brand…"
            className={`${fieldClass()} resize-none`}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Website URL</label>
          <input {...register('websiteUrl')} type="url" placeholder="https://www.example.com" className={fieldClass()} />
          <FieldError message={errors.websiteUrl?.message} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Logo URL</label>
          <input {...register('logoUrl')} placeholder="https://cdn.example.com/logo.png" className={fieldClass()} />
        </div>

        <div className="flex items-center gap-2">
          <input
            {...register('isActive')}
            type="checkbox"
            id="isActive"
            className="w-4 h-4 rounded border-[#262626] bg-[#111111] accent-amber-400"
          />
          <label htmlFor="isActive" className="text-sm text-gray-400">Active</label>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="px-4 py-2.5 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Create Brand</>}
          </button>
        </div>
      </form>
    </div>
  )
}
