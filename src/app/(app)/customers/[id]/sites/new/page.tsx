'use client'

import { useState, useTransition, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { type Resolver } from 'react-hook-form'
import { apiGet, apiPost } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import type { Customer } from '@/types'

const schema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  siteType: z.enum(['CONSTRUCTION_SITE', 'FACTORY', 'WAREHOUSE', 'OFFICE', 'OTHER']),
  address: z.string().optional(),
  province: z.string().optional(),
  country: z.string().default('Thailand'),
  projectStartDate: z.string().optional(),
  projectEndDate: z.string().optional(),
  contacts: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    title: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    isPrimary: z.boolean().default(false),
  })).optional(),
})

type FormData = z.infer<typeof schema>

function fieldClass() {
  return 'w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50'
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

export default function NewSitePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { siteType: 'CONSTRUCTION_SITE', country: 'Thailand', contacts: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' })

  useEffect(() => {
    if (!id) return
    startTransition(async () => {
      try {
        const c = await apiGet<Customer>(`/api/customers/${id}`)
        setCustomer(c)
      } catch { /* non-critical */ }
    })
  }, [id])

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPost(`/api/customers/${id}/sites`, {
        siteName: data.siteName,
        siteType: data.siteType,
        address: data.address || null,
        province: data.province || null,
        country: data.country || 'Thailand',
        projectStartDate: data.projectStartDate ? new Date(data.projectStartDate).toISOString() : null,
        projectEndDate: data.projectEndDate ? new Date(data.projectEndDate).toISOString() : null,
        contacts: data.contacts?.filter((c) => c.name).map((c) => ({
          name: c.name,
          title: c.title || null,
          phone: c.phone || null,
          email: c.email || null,
          isPrimary: c.isPrimary,
        })) ?? [],
      })
      router.push(`/customers/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create site')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push(`/customers/${id}`)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Add Site</h1>
      </div>
      {customer && (
        <p className="text-xs text-gray-500 mb-5 ml-9">{customer.companyName}</p>
      )}
      {isPending && !customer && <div className="h-4 mb-5" />}

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
          <input {...register('siteName')} placeholder="e.g. MRT Blue Line Extension Site" className={fieldClass()} />
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

        {/* Contacts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-400">Contacts</label>
            <button
              type="button"
              onClick={() => append({ name: '', title: '', phone: '', email: '', isPrimary: false })}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Plus size={12} /> Add Contact
            </button>
          </div>

          {fields.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-3 border border-dashed border-[#262626] rounded-lg">
              No contacts — optional
            </p>
          )}

          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="bg-[#111111] border border-[#262626] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Contact {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input {...register(`contacts.${i}.isPrimary`)} type="checkbox"
                        className="w-3 h-3 accent-amber-400" />
                      Primary
                    </label>
                    <button type="button" onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input {...register(`contacts.${i}.name`)} placeholder="Full name *" className={cn(fieldClass(), 'text-xs py-1.5')} />
                    <FieldError message={errors.contacts?.[i]?.name?.message} />
                  </div>
                  <input {...register(`contacts.${i}.title`)} placeholder="Title / Role" className={cn(fieldClass(), 'text-xs py-1.5')} />
                  <input {...register(`contacts.${i}.phone`)} placeholder="Phone" className={cn(fieldClass(), 'text-xs py-1.5')} />
                  <input {...register(`contacts.${i}.email`)} placeholder="Email" className={cn(fieldClass(), 'text-xs py-1.5')} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => router.push(`/customers/${id}`)}
            className="px-4 py-2.5 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Add Site</>}
          </button>
        </div>
      </form>
    </div>
  )
}
