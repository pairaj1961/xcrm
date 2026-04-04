'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { apiGet, apiPut } from '@/lib/apiClient'
import type { Customer } from '@/types'

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  industry: z.enum(['CONSTRUCTION', 'INDUSTRIAL_FACTORY', 'OTHER']),
  tier: z.enum(['PROSPECT', 'ACTIVE', 'VIP', 'INACTIVE']),
  billingAddress: z.string().optional(),
  website: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function fieldClass() {
  return 'w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50'
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!id) return
    startTransition(async () => {
      try {
        const customer = await apiGet<Customer>(`/api/customers/${id}`)
        reset({
          companyName: customer.companyName,
          industry: customer.industry,
          tier: customer.tier,
          billingAddress: customer.billingAddress ?? '',
          website: customer.website ?? '',
          registrationNumber: customer.registrationNumber ?? '',
          taxId: customer.taxId ?? '',
          notes: customer.notes ?? '',
        })
      } catch {
        setLoadError('Failed to load customer')
      }
    })
  }, [id, reset])

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPut(`/api/customers/${id}`, {
        companyName: data.companyName,
        industry: data.industry,
        tier: data.tier,
        billingAddress: data.billingAddress || null,
        website: data.website || null,
        registrationNumber: data.registrationNumber || null,
        taxId: data.taxId || null,
        notes: data.notes || null,
      })
      router.push(`/customers/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  if (isPending || (loadError === null && !errors.companyName)) {
    // Show skeleton only while loading (before form is populated)
  }

  if (isPending) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#1e1e1e] rounded w-32" />
        <div className="h-10 bg-[#111111] border border-[#262626] rounded-xl" />
        <div className="h-48 bg-[#111111] border border-[#262626] rounded-xl" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 text-sm">{loadError}</p>
        <button onClick={() => router.back()} className="text-xs text-amber-400 hover:text-amber-300">Go back</button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/customers/${id}`)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Edit Customer</h1>
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Company Name <span className="text-red-400">*</span>
          </label>
          <input {...register('companyName')} className={fieldClass()} />
          <FieldError message={errors.companyName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Industry <span className="text-red-400">*</span></label>
            <select {...register('industry')} className={fieldClass()}>
              <option value="CONSTRUCTION">Construction</option>
              <option value="INDUSTRIAL_FACTORY">Industrial Factory</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Tier</label>
            <select {...register('tier')} className={fieldClass()}>
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Active</option>
              <option value="VIP">VIP</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Billing Address</label>
          <textarea {...register('billingAddress')} rows={2} className={`${fieldClass()} resize-none`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Tax ID</label>
            <input {...register('taxId')} className={fieldClass()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Registration No.</label>
            <input {...register('registrationNumber')} className={fieldClass()} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Website</label>
          <input {...register('website')} type="url" placeholder="https://www.example.com" className={fieldClass()} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
          <textarea {...register('notes')} rows={3} className={`${fieldClass()} resize-none`} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => router.push(`/customers/${id}`)}
            className="px-4 py-2.5 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  )
}
