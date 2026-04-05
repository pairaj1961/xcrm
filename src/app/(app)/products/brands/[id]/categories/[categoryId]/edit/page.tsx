'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/apiClient'

interface CategoryData {
  id: string
  name: string
  productType: 'EQUIPMENT' | 'CONSUMABLE' | 'ACCESSORY'
  description?: string | null
  isActive: boolean
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  productType: z.enum(['EQUIPMENT', 'CONSUMABLE', 'ACCESSORY']),
  description: z.string().optional(),
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

export default function EditCategoryPage() {
  const { id: brandId, categoryId } = useParams<{ id: string; categoryId: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { productType: 'EQUIPMENT', isActive: true },
  })

  useEffect(() => {
    if (!brandId || !categoryId) return
    startTransition(async () => {
      try {
        const categories = await apiGet<CategoryData[]>(`/api/products/brands/${brandId}/categories`)
        const category = categories.find((c) => c.id === categoryId)
        if (!category) { setLoadError('Category not found'); return }
        reset({
          name: category.name,
          productType: category.productType,
          description: category.description ?? '',
          isActive: category.isActive,
        })
        setLoadError(null)
      } catch {
        setLoadError('Failed to load category')
      }
    })
  }, [brandId, categoryId, reset])

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPatch(`/api/products/brands/${brandId}/categories/${categoryId}`, {
        name: data.name,
        productType: data.productType,
        description: data.description || null,
        isActive: data.isActive,
      })
      router.push(`/products/brands/${brandId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  if (isPending) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#1e1e1e] rounded w-32" />
        <div className="h-10 bg-[#1e1e1e] rounded" />
        <div className="h-10 bg-[#1e1e1e] rounded" />
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
        <button onClick={() => router.push(`/products/brands/${brandId}`)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Edit Category</h1>
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Name <span className="text-red-400">*</span>
          </label>
          <input {...register('name')} className={fieldClass()} />
          <FieldError message={errors.name?.message} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Product Type <span className="text-red-400">*</span>
          </label>
          <select {...register('productType')} className={fieldClass()}>
            <option value="EQUIPMENT">Equipment</option>
            <option value="CONSUMABLE">Consumable</option>
            <option value="ACCESSORY">Accessory</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Brief description of this category…"
            className={`${fieldClass()} resize-none`}
          />
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
            onClick={() => router.push(`/products/brands/${brandId}`)}
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
