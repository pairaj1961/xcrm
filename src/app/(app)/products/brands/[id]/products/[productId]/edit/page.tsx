'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { type Resolver } from 'react-hook-form'
import { apiGet, apiPatch } from '@/lib/apiClient'

interface ProductData {
  id: string
  modelName: string
  modelNumber?: string | null
  sku?: string | null
  description?: string | null
  productType: 'EQUIPMENT' | 'CONSUMABLE' | 'ACCESSORY'
  unit: string
  minimumOrderQty: number
  salePrice?: number | null
  rentalDailyRate?: number | null
  rentalWeeklyRate?: number | null
  rentalMonthlyRate?: number | null
  serviceRatePerHour?: number | null
  isActive: boolean
  category: { id: string; name: string; productType: string }
}

const schema = z.object({
  modelName: z.string().min(1, 'Model name is required'),
  modelNumber: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  productType: z.enum(['EQUIPMENT', 'CONSUMABLE', 'ACCESSORY']),
  unit: z.string().min(1, 'Unit is required'),
  minimumOrderQty: z.coerce.number().int().min(1),
  salePrice: z.coerce.number().min(0).optional().or(z.literal('')),
  rentalDailyRate: z.coerce.number().min(0).optional().or(z.literal('')),
  rentalWeeklyRate: z.coerce.number().min(0).optional().or(z.literal('')),
  rentalMonthlyRate: z.coerce.number().min(0).optional().or(z.literal('')),
  serviceRatePerHour: z.coerce.number().min(0).optional().or(z.literal('')),
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

export default function EditProductPage() {
  const { id: brandId, productId } = useParams<{ id: string; productId: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { isActive: true, minimumOrderQty: 1 },
  })

  useEffect(() => {
    if (!productId) return
    startTransition(async () => {
      try {
        const p = await apiGet<ProductData>(`/api/products/items/${productId}`)
        setCategoryName(p.category.name)
        reset({
          modelName: p.modelName,
          modelNumber: p.modelNumber ?? '',
          sku: p.sku ?? '',
          description: p.description ?? '',
          productType: p.productType,
          unit: p.unit,
          minimumOrderQty: p.minimumOrderQty,
          salePrice: p.salePrice ?? '',
          rentalDailyRate: p.rentalDailyRate ?? '',
          rentalWeeklyRate: p.rentalWeeklyRate ?? '',
          rentalMonthlyRate: p.rentalMonthlyRate ?? '',
          serviceRatePerHour: p.serviceRatePerHour ?? '',
          isActive: p.isActive,
        })
        setLoadError(null)
      } catch {
        setLoadError('Failed to load product')
      }
    })
  }, [productId, reset])

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPatch(`/api/products/items/${productId}`, {
        modelName: data.modelName,
        modelNumber: data.modelNumber || null,
        sku: data.sku || null,
        description: data.description || null,
        productType: data.productType,
        unit: data.unit,
        minimumOrderQty: Number(data.minimumOrderQty),
        salePrice: data.salePrice !== '' && data.salePrice != null ? Number(data.salePrice) : null,
        rentalDailyRate: data.rentalDailyRate !== '' && data.rentalDailyRate != null ? Number(data.rentalDailyRate) : null,
        rentalWeeklyRate: data.rentalWeeklyRate !== '' && data.rentalWeeklyRate != null ? Number(data.rentalWeeklyRate) : null,
        rentalMonthlyRate: data.rentalMonthlyRate !== '' && data.rentalMonthlyRate != null ? Number(data.rentalMonthlyRate) : null,
        serviceRatePerHour: data.serviceRatePerHour !== '' && data.serviceRatePerHour != null ? Number(data.serviceRatePerHour) : null,
        isActive: data.isActive,
      })
      router.push(`/products/brands/${brandId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save product')
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
        <button onClick={() => router.push(`/products/brands/${brandId}`)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Edit Product</h1>
          {categoryName && <p className="text-xs text-gray-500">{categoryName}</p>}
        </div>
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Model Name <span className="text-red-400">*</span>
            </label>
            <input {...register('modelName')} className={fieldClass()} />
            <FieldError message={errors.modelName?.message} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Model Number</label>
            <input {...register('modelNumber')} className={fieldClass()} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">SKU</label>
            <input {...register('sku')} className={fieldClass()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Product Type</label>
            <select {...register('productType')} className={fieldClass()}>
              <option value="EQUIPMENT">Equipment</option>
              <option value="CONSUMABLE">Consumable</option>
              <option value="ACCESSORY">Accessory</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            className={`${fieldClass()} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Unit</label>
            <input {...register('unit')} className={fieldClass()} />
            <FieldError message={errors.unit?.message} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Min. Order Qty</label>
            <input {...register('minimumOrderQty')} type="number" min="1" className={fieldClass()} />
          </div>
        </div>

        {/* Pricing */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Pricing</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Sale Price', name: 'salePrice' },
              { label: 'Service Rate/hr', name: 'serviceRatePerHour' },
              { label: 'Rental Daily Rate', name: 'rentalDailyRate' },
              { label: 'Rental Weekly Rate', name: 'rentalWeeklyRate' },
              { label: 'Rental Monthly Rate', name: 'rentalMonthlyRate' },
            ].map(({ label, name }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
                <input
                  {...register(name as Parameters<typeof register>[0])}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={fieldClass()}
                />
              </div>
            ))}
          </div>
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
