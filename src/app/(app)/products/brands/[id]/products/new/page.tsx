'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/apiClient'

interface Category {
  id: string
  name: string
  productType: string
}

const schema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
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

function PriceField({ label, name, register }: { label: string; name: Parameters<typeof register>[0]; register: ReturnType<typeof useForm<FormData>>['register'] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        {...register(name)}
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        className={fieldClass()}
      />
    </div>
  )
}

export default function NewProductPage() {
  const { id: brandId } = useParams<{ id: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      productType: 'EQUIPMENT',
      unit: 'piece',
      minimumOrderQty: 1,
      isActive: true,
    },
  })

  useEffect(() => {
    if (!brandId) return
    startTransition(async () => {
      try {
        const data = await apiGet<Category[]>(`/api/products/brands/${brandId}/categories`)
        setCategories(data)
      } catch {
        // categories remain empty
      }
    })
  }, [brandId])

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPost(`/api/products/brands/${brandId}/items`, {
        categoryId: data.categoryId,
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
      setSubmitError(err instanceof Error ? err.message : 'Failed to create product')
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/products/brands/${brandId}`)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">New Product</h1>
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Category <span className="text-red-400">*</span>
          </label>
          {categories.length === 0 ? (
            <p className="text-xs text-amber-400 py-2">
              No categories found. Add a category to this brand first.
            </p>
          ) : (
            <select {...register('categoryId')} className={fieldClass()}>
              <option value="">Select category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.productType})</option>
              ))}
            </select>
          )}
          <FieldError message={errors.categoryId?.message} />
        </div>

        {/* Model Name + Number */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Model Name <span className="text-red-400">*</span>
            </label>
            <input {...register('modelName')} placeholder="e.g. DHP484" className={fieldClass()} />
            <FieldError message={errors.modelName?.message} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Model Number</label>
            <input {...register('modelNumber')} placeholder="Part no." className={fieldClass()} />
          </div>
        </div>

        {/* SKU + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">SKU</label>
            <input {...register('sku')} placeholder="Unique SKU" className={fieldClass()} />
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
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Brief product description…"
            className={`${fieldClass()} resize-none`}
          />
        </div>

        {/* Unit + Min Qty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Unit</label>
            <input {...register('unit')} placeholder="piece, set, box…" className={fieldClass()} />
            <FieldError message={errors.unit?.message} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Min. Order Qty</label>
            <input {...register('minimumOrderQty')} type="number" min="1" className={fieldClass()} />
          </div>
        </div>

        {/* Pricing */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Pricing (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <PriceField label="Sale Price" name="salePrice" register={register} />
            <PriceField label="Service Rate/hr" name="serviceRatePerHour" register={register} />
            <PriceField label="Rental Daily Rate" name="rentalDailyRate" register={register} />
            <PriceField label="Rental Weekly Rate" name="rentalWeeklyRate" register={register} />
            <PriceField label="Rental Monthly Rate" name="rentalMonthlyRate" register={register} />
          </div>
        </div>

        {/* Active */}
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
            disabled={submitting || categories.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Create Product</>}
          </button>
        </div>
      </form>
    </div>
  )
}
