'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/apiClient'

interface BrandData {
  id: string
  name: string
  countryOfOrigin?: string | null
  description?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  isActive: boolean
}

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

export default function EditBrandPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true },
  })

  useEffect(() => {
    if (!id) return
    startTransition(async () => {
      try {
        const brand = await apiGet<BrandData>(`/api/products/brands/${id}`)
        reset({
          name: brand.name,
          countryOfOrigin: brand.countryOfOrigin ?? '',
          description: brand.description ?? '',
          websiteUrl: brand.websiteUrl ?? '',
          logoUrl: brand.logoUrl ?? '',
          isActive: brand.isActive,
        })
        setLoadError(null)
      } catch {
        setLoadError('Failed to load brand')
      }
    })
  }, [id, reset])

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPatch(`/api/products/brands/${id}`, {
        name: data.name,
        countryOfOrigin: data.countryOfOrigin || null,
        description: data.description || null,
        websiteUrl: data.websiteUrl || null,
        logoUrl: data.logoUrl || null,
        isActive: data.isActive,
      })
      router.push(`/products/brands/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save brand')
    } finally {
      setSubmitting(false)
    }
  }

  if (isPending || loadError === null && !submitting && errors && Object.keys(errors).length === 0) {
    // still loading — show skeleton only before form data arrives
  }

  if (isPending) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#1e1e1e] rounded w-32" />
        <div className="h-10 bg-[#1e1e1e] rounded" />
        <div className="h-10 bg-[#1e1e1e] rounded" />
        <div className="h-24 bg-[#1e1e1e] rounded" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <p className="text-gray-500 text-sm">{loadError}</p>
        <button onClick={() => router.back()} className="text-xs text-amber-400 hover:text-amber-300">Go back</button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/products/brands/${id}`)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Edit Brand</h1>
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
          <input {...register('name')} className={fieldClass()} />
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
            onClick={() => router.push(`/products/brands/${id}`)}
            className="px-4 py-2.5 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  )
}
