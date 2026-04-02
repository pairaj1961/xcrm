'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Check, Search, Building, MapPin } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'
import { formatStatus } from '@/utils/format'
import type { Customer, CustomerSite, UserProfile, Lead } from '@/types'

// ── Schemas ───────────────────────────────────────────────────────────────────

const step2Schema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  serviceLine: z.enum(['SALE', 'RENTAL', 'SERVICE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dealValue: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  decisionMakerName: z.string().max(255).optional(),
  decisionMakerTitle: z.string().max(255).optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
})

type Step2Data = z.infer<typeof step2Schema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors',
              s < step
                ? 'bg-amber-400 border-amber-400 text-black'
                : s === step
                ? 'border-amber-400 text-amber-400'
                : 'border-[#262626] text-gray-600'
            )}
          >
            {s < step ? <Check size={12} /> : s}
          </div>
          <span className={cn('text-xs', s === step ? 'text-gray-300' : 'text-gray-600')}>
            {s === 1 ? 'Customer & Site' : 'Lead Details'}
          </span>
          {s < 2 && <div className="w-8 h-px bg-[#262626]" />}
        </div>
      ))}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

// ── Step 1: Customer & Site ───────────────────────────────────────────────────

function Step1({
  onNext,
}: {
  onNext: (customer: Customer, site: CustomerSite | null) => void
}) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [sites, setSites] = useState<CustomerSite[]>([])
  const [selectedSite, setSelectedSite] = useState<CustomerSite | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const debouncedSearch = useDebounce(search)

  const fetchCustomers = useCallback(async (q: string) => {
    setLoadingCustomers(true)
    try {
      const url = q.trim()
        ? `/api/customers?search=${encodeURIComponent(q)}&pageSize=20`
        : `/api/customers?pageSize=50`
      const res = await apiGet<{ data: Customer[] }>(url)
      setCustomers(res.data)
    } catch {
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }, [])

  // Load all customers on mount
  useEffect(() => {
    fetchCustomers('')
  }, [fetchCustomers])

  // Re-fetch when search changes
  useEffect(() => {
    fetchCustomers(debouncedSearch)
  }, [debouncedSearch, fetchCustomers])

  async function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setSearch(c.companyName)
    setShowDropdown(false)
    setSites([])
    setSelectedSite(null)
    try {
      const res = await apiGet<CustomerSite[]>(`/api/customers/${c.id}/sites?pageSize=50`)
      setSites(Array.isArray(res) ? res : [])
    } catch {
      setSites([])
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Customer <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search by company name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (selectedCustomer && e.target.value !== selectedCustomer.companyName) {
                  setSelectedCustomer(null)
                  setSites([])
                  setSelectedSite(null)
                }
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
            />
            {loadingCustomers && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {showDropdown && !selectedCustomer && customers.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-[#1a1a1a] border border-[#262626] rounded-lg shadow-xl overflow-hidden">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#262626] transition-colors text-left"
                >
                  <Building size={14} className="text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-200">{c.companyName}</p>
                    <p className="text-xs text-gray-600">{c.industry} · {c.tier}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Building size={14} className="text-amber-400" />
            <div>
              <p className="text-sm text-amber-300">{selectedCustomer.companyName}</p>
              <p className="text-xs text-amber-400/60">{selectedCustomer.tier} · {selectedCustomer.industry}</p>
            </div>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Site <span className="text-gray-600">(optional)</span>
          </label>
          {sites.length === 0 ? (
            <p className="text-xs text-gray-600">No sites found for this customer</p>
          ) : (
            <div className="space-y-1.5">
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => setSelectedSite(selectedSite?.id === site.id ? null : site)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 border rounded-lg text-left transition-colors',
                    selectedSite?.id === site.id
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-[#262626] bg-[#111111] hover:border-[#333333]'
                  )}
                >
                  <MapPin size={14} className={selectedSite?.id === site.id ? 'text-amber-400' : 'text-gray-600'} />
                  <div>
                    <p className={cn('text-sm', selectedSite?.id === site.id ? 'text-amber-300' : 'text-gray-300')}>
                      {site.siteName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {site.siteType}{site.province ? ` · ${site.province}` : ''}
                    </p>
                  </div>
                  {selectedSite?.id === site.id && (
                    <Check size={14} className="text-amber-400 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          disabled={!selectedCustomer}
          onClick={() => selectedCustomer && onNext(selectedCustomer, selectedSite)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Lead Details ──────────────────────────────────────────────────────

function Step2({
  customer,
  site,
  onBack,
  onSubmit,
  submitting,
}: {
  customer: Customer
  site: CustomerSite | null
  onBack: () => void
  onSubmit: (data: Step2Data) => void
  submitting: boolean
}) {
  const { user } = useAuthStore()
  const [reps, setReps] = useState<UserProfile[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      priority: 'MEDIUM',
      assignedToId: user?.id ?? '',
    },
  })

  useEffect(() => {
    if (user?.role !== 'REP') {
      apiGet<UserProfile[]>('/api/users?role=REP&isActive=true&pageSize=100')
        .then((res) => setReps(Array.isArray(res) ? res : []))
        .catch(() => {})
    }
  }, [user])

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Context summary */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded-lg text-xs text-gray-500">
        <Building size={13} className="text-amber-400" />
        <span>{customer.companyName}</span>
        {site && (
          <>
            <span className="text-gray-700">·</span>
            <MapPin size={12} className="text-gray-600" />
            <span>{site.siteName}</span>
          </>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          {...register('title')}
          placeholder="e.g. Atlas Copco Compressor Rental Q2"
          className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
        />
        <FieldError message={errors.title?.message} />
      </div>

      {/* Service line + Priority row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Service Line <span className="text-red-400">*</span>
          </label>
          <select
            {...register('serviceLine')}
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Select…</option>
            <option value="SALE">Sale</option>
            <option value="RENTAL">Rental</option>
            <option value="SERVICE">Service</option>
          </select>
          <FieldError message={errors.serviceLine?.message} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Priority</label>
          <select
            {...register('priority')}
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Deal value + Close date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Deal Value (฿)</label>
          <input
            {...register('dealValue')}
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Expected Close</label>
          <input
            {...register('expectedCloseDate')}
            type="date"
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Decision maker */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Decision Maker</label>
          <input
            {...register('decisionMakerName')}
            placeholder="Full name"
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Title / Role</label>
          <input
            {...register('decisionMakerTitle')}
            placeholder="e.g. Procurement Manager"
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Assigned to — only for MANAGER/ADMIN */}
      {isManagerOrAdmin && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Assigned To</label>
          <select
            {...register('assignedToId')}
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 focus:outline-none focus:border-amber-500/50"
          >
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
          placeholder="Any initial notes or context…"
          className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check size={16} /> Create Lead
            </>
          )}
        </button>
      </div>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewLeadPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [site, setSite] = useState<CustomerSite | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleStep1Next(c: Customer, s: CustomerSite | null) {
    setCustomer(c)
    setSite(s)
    setStep(2)
  }

  async function handleStep2Submit(data: Step2Data) {
    if (!customer || !user) return
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        title: data.title,
        customerId: customer.id,
        siteId: site?.id ?? null,
        serviceLine: data.serviceLine,
        priority: data.priority,
        dealValue: data.dealValue ? parseFloat(data.dealValue) : null,
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate).toISOString()
          : null,
        decisionMakerName: data.decisionMakerName || null,
        decisionMakerTitle: data.decisionMakerTitle || null,
        assignedToId: user.role === 'REP' ? user.id : (data.assignedToId || user.id),
        notes: data.notes || null,
      }

      const lead = await apiPost<Lead>('/api/leads', payload)
      router.push(`/leads/${lead.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => (step === 1 ? router.push('/leads') : setStep(1))}
          className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">New Lead</h1>
      </div>

      <StepIndicator step={step} />

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {step === 1 && <Step1 onNext={handleStep1Next} />}
      {step === 2 && customer && (
        <Step2
          customer={customer}
          site={site}
          onBack={() => setStep(1)}
          onSubmit={handleStep2Submit}
          submitting={submitting}
        />
      )}
    </div>
  )
}
