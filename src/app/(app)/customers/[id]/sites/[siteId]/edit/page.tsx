'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { type Resolver } from 'react-hook-form'
import { apiGet, apiPatch } from '@/lib/apiClient'

interface SiteData {
  id: string
  siteName: string
  siteType: 'CONSTRUCTION_SITE' | 'FACTORY' | 'WAREHOUSE' | 'OFFICE' | 'OTHER'
  address?: string | null
  province?: string | null
  country: string
  projectStartDate?: string | null
  projectEndDate?: string | null
  isActive: boolean
}

const schema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  siteType: z.enum(['CONSTRUCTION_SITE', 'FACTORY', 'WAREHOUSE', 'OFFICE', 'OTHER']),
  address: z.string().optional(),
  province: z.string().optional(),
  country: z.string().default('Thailand'),
  projectStartDate: z.string().optional(),
  projectEndDate: z.string().optional(),
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

function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

export default function EditSitePage() {
  const { id: customerId, siteId } = useParams<{ id: string; siteId: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { siteType: 'CONSTRUCTION_SITE', country: 'Thailand', isActive: true },
  })

  useEffect(() => {
    if (!customerId || !siteId) return
    startTransition(async () => {
      try {
        const sites = await apiGet<SiteData[]>(`/api/customers/${customerId}/sites`)
        const site = sites.find((s) => s.id === siteId)
        if (!site) { setLoadError('Site not found'); return }
        reset({
          siteName: site.siteName,
          siteType: site.siteType,
          address: site.address ?? '',
          province: site.province ?? '',
          country: site.country || 'Thailand',
          projectStartDate: toDateInput(site.projectStartDate),
          projectEndDate: toDateInput(site.projectEndDate),
          isActive: site.isActive,
        })
        setLoadError(null)
      } catch {
        setLoadError('Failed to load site')
      }
    })
  }, [customerId, siteId, reset])

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPatch(`/api/customers/${customerId}/sites/${siteId}`, {
        siteName: data.siteName,
        siteType: data.siteType,
        address: data.address || null,
        province: data.province || null,
        country: data.country || 'Thailand',
        projectStartDate: data.projectStartDate ? new Date(data.projectStartDate).toISOString() : null,
        projectEndDate: data.projectEndDate ? new Date(data.projectEndDate).toISOString() : null,
        isActive: data.isActive,
      })
      router.push(`/customers/${customerId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save site')
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
        <div className="h-16 bg-[#1e1e1e] rounded" />
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
        <button onClick={() => router.push(`/customers/${customerId}`)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Edit Site</h1>
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Site Name <span className="text-red-400">*</span>
          </label>
          <input {...register('siteName')} className={fieldClass()} />
          <FieldError message={errors.siteName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Site Type <span className="text-red-400">*</span></label>
            <select {...register('siteType')} className={fieldClass()}>
              <option value="CONSTRUCTION_SITE">Construction Site</option>
              <option value="FACTORY">Factory</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="OFFICE">Office</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Province</label>
            <input {...register('province')} placeholder="e.g. Bangkok" className={fieldClass()} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Address</label>
          <textarea {...register('address')} rows={2} placeholder="Full site address" className={`${fieldClass()} resize-none`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Project Start</label>
            <input {...register('projectStartDate')} type="date" className={fieldClass()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Project End</label>
            <input {...register('projectEndDate')} type="date" className={fieldClass()} />
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
          <button type="button" onClick={() => router.push(`/customers/${customerId}`)}
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
