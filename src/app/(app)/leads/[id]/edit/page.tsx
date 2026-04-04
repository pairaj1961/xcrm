'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Building, MapPin, Loader2 } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'
import type { LeadDetail, UserProfile } from '@/types'

const editLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  serviceLine: z.enum(['SALE', 'RENTAL', 'SERVICE']),
  status: z.enum(['NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUOTE_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dealValue: z.string().optional(),
  rentalDurationDays: z.string().optional(),
  serviceContractMonths: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  decisionMakerName: z.string().max(255).optional(),
  decisionMakerTitle: z.string().max(255).optional(),
  assignedToId: z.string().optional(),
  lostReason: z.string().max(500).optional(),
  lostToCompetitor: z.string().max(255).optional(),
  notes: z.string().optional(),
})

type EditLeadData = z.infer<typeof editLeadSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

function fieldClass() {
  return 'w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50'
}

export default function EditLeadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [reps, setReps] = useState<UserProfile[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditLeadData>({
    resolver: zodResolver(editLeadSchema),
  })

  const watchedStatus = watch('status')
  const watchedServiceLine = watch('serviceLine')

  useEffect(() => {
    if (!id) return
    startTransition(async () => {
      try {
        const data = await apiGet<LeadDetail>(`/api/leads/${id}`)
        setLead(data)
        reset({
          title: data.title,
          serviceLine: data.serviceLine,
          status: data.status,
          priority: data.priority,
          dealValue: data.dealValue != null ? String(data.dealValue) : '',
          rentalDurationDays: data.rentalDurationDays != null ? String(data.rentalDurationDays) : '',
          serviceContractMonths: data.serviceContractMonths != null ? String(data.serviceContractMonths) : '',
          expectedCloseDate: data.expectedCloseDate
            ? data.expectedCloseDate.substring(0, 10)
            : '',
          decisionMakerName: data.decisionMakerName ?? '',
          decisionMakerTitle: data.decisionMakerTitle ?? '',
          assignedToId: data.assignedToId,
          lostReason: data.lostReason ?? '',
          lostToCompetitor: data.lostToCompetitor ?? '',
          notes: data.notes ?? '',
        })
      } catch {
        setLoadError('Failed to load lead')
      }
    })
  }, [id, reset])

  useEffect(() => {
    if (!user || user.role === 'REP') return
    apiGet<UserProfile[]>('/api/users?role=REP&isActive=true&pageSize=100')
      .then((res) => setReps(Array.isArray(res) ? res : []))
      .catch(() => {})
  }, [user])

  async function onSubmit(data: EditLeadData) {
    if (!id) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiPatch(`/api/leads/${id}`, {
        title: data.title,
        serviceLine: data.serviceLine,
        status: data.status,
        priority: data.priority,
        dealValue: data.dealValue ? parseFloat(data.dealValue) : null,
        rentalDurationDays: data.rentalDurationDays ? parseInt(data.rentalDurationDays) : null,
        serviceContractMonths: data.serviceContractMonths ? parseInt(data.serviceContractMonths) : null,
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate).toISOString()
          : null,
        decisionMakerName: data.decisionMakerName || null,
        decisionMakerTitle: data.decisionMakerTitle || null,
        assignedToId: data.assignedToId || undefined,
        lostReason: data.lostReason || null,
        lostToCompetitor: data.lostToCompetitor || null,
        notes: data.notes || null,
      })
      router.push(`/leads/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  if (isPending || (lead === null && loadError === null)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#1e1e1e] rounded w-32" />
        <div className="h-10 bg-[#111111] border border-[#262626] rounded-xl" />
        <div className="h-64 bg-[#111111] border border-[#262626] rounded-xl" />
      </div>
    )
  }

  if (loadError || !lead) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 text-sm">{loadError ?? 'Lead not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-amber-400 hover:text-amber-300">
          Go back
        </button>
      </div>
    )
  }

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/leads/${id}`)}
          className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Edit Lead</h1>
      </div>

      {/* Context (read-only) */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded-lg text-xs text-gray-500 mb-5">
        <Building size={13} className="text-amber-400 flex-shrink-0" />
        <span>{lead.customer?.companyName}</span>
        {lead.site && (
          <>
            <span className="text-gray-700">·</span>
            <MapPin size={12} className="text-gray-600 flex-shrink-0" />
            <span>{(lead.site as { siteName: string }).siteName}</span>
          </>
        )}
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input {...register('title')} className={fieldClass()} placeholder="Lead title" />
          <FieldError message={errors.title?.message} />
        </div>

        {/* Service Line + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Service Line <span className="text-red-400">*</span>
            </label>
            <select {...register('serviceLine')} className={fieldClass()}>
              <option value="SALE">Sale</option>
              <option value="RENTAL">Rental</option>
              <option value="SERVICE">Service</option>
            </select>
            <FieldError message={errors.serviceLine?.message} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
            <select {...register('status')} className={fieldClass()}>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="SITE_VISIT_SCHEDULED">Site Visit Scheduled</option>
              <option value="QUOTE_SENT">Quote Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Priority</label>
          <select {...register('priority')} className={fieldClass()}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Deal Value + Expected Close */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Deal Value (฿)</label>
            <input
              {...register('dealValue')}
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              className={fieldClass()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Expected Close</label>
            <input {...register('expectedCloseDate')} type="date" className={fieldClass()} />
          </div>
        </div>

        {/* Rental duration (conditional) */}
        {watchedServiceLine === 'RENTAL' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Rental Duration (days)</label>
            <input
              {...register('rentalDurationDays')}
              type="number"
              min="1"
              placeholder="e.g. 30"
              className={fieldClass()}
            />
          </div>
        )}

        {/* Service contract months (conditional) */}
        {watchedServiceLine === 'SERVICE' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Service Contract (months)</label>
            <input
              {...register('serviceContractMonths')}
              type="number"
              min="1"
              placeholder="e.g. 12"
              className={fieldClass()}
            />
          </div>
        )}

        {/* Lost reason (conditional) */}
        {watchedStatus === 'CLOSED_LOST' && (
          <div className="space-y-3 p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Lost Reason</label>
              <textarea
                {...register('lostReason')}
                rows={2}
                placeholder="Why was this lead lost?"
                className={cn(fieldClass(), 'resize-none')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Lost to Competitor</label>
              <input
                {...register('lostToCompetitor')}
                placeholder="Competitor name (optional)"
                className={fieldClass()}
              />
            </div>
          </div>
        )}

        {/* Decision maker */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Decision Maker</label>
            <input {...register('decisionMakerName')} placeholder="Full name" className={fieldClass()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Title / Role</label>
            <input
              {...register('decisionMakerTitle')}
              placeholder="e.g. Procurement Manager"
              className={fieldClass()}
            />
          </div>
        </div>

        {/* Assigned to — only for MANAGER/ADMIN */}
        {isManagerOrAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Assigned To</label>
            <select {...register('assignedToId')} className={fieldClass()}>
              <option value={user?.id ?? ''}>Me ({user?.firstName} {user?.lastName})</option>
              {reps
                .filter((r) => r.id !== user?.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.firstName} {r.lastName}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any notes or context…"
            className={cn(fieldClass(), 'resize-none')}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push(`/leads/${id}`)}
            className="px-4 py-2.5 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                <Check size={15} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
