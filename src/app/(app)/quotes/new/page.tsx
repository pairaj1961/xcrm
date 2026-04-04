'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/apiClient'

interface Lead {
  id: string
  title: string
  customer?: { companyName: string } | null
}

interface LeadsResponse {
  data: Lead[]
  total: number
  totalPages: number
}

interface Quote {
  id: string
}

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty: z.coerce.number().int().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0, 'Must be ≥ 0'),
  discount: z.coerce.number().min(0).max(100).default(0),
})

const schema = z.object({
  leadId: z.string().min(1, 'Lead is required'),
  validUntil: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
})

type FormData = z.infer<typeof schema>

function fieldClass() {
  return 'w-full px-3 py-2 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50'
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultLeadId = searchParams.get('leadId') ?? ''

  const [isPending, startTransition] = useTransition()
  const [leads, setLeads] = useState<Lead[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      leadId: defaultLeadId,
      taxRate: 7,
      lineItems: [{ description: '', qty: 1, unitPrice: 0, discount: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  useEffect(() => {
    startTransition(async () => {
      try {
        const res = await apiGet<LeadsResponse>('/api/leads?pageSize=100&status=NEW,CONTACTED,SITE_VISIT_SCHEDULED,QUOTE_SENT,NEGOTIATION')
        setLeads(res.data)
      } catch {
        // leads remain empty
      }
    })
  }, [])

  const watchedItems = watch('lineItems')
  const taxRate = watch('taxRate') ?? 7

  const subtotal = watchedItems?.reduce((sum, item) => {
    const qty = Number(item.qty) || 0
    const price = Number(item.unitPrice) || 0
    const disc = Number(item.discount) || 0
    return sum + qty * price * (1 - disc / 100)
  }, 0) ?? 0

  const taxAmount = subtotal * (Number(taxRate) / 100)
  const total = subtotal + taxAmount

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(n)
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const quote = await apiPost<Quote>('/api/quotes', {
        leadId: data.leadId,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
        taxRate: data.taxRate != null ? Number(data.taxRate) : undefined,
        notes: data.notes || null,
        lineItems: data.lineItems.map((item) => ({
          description: item.description,
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount) || 0,
        })),
      })
      router.push(`/quotes/${quote.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create quote')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/quotes')} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">New Quote</h1>
      </div>

      {submitError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Lead + Meta */}
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Quote Details</h2>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Lead <span className="text-red-400">*</span>
            </label>
            {isPending ? (
              <div className="h-9 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ) : (
              <select {...register('leadId')} className={fieldClass()}>
                <option value="">Select a lead…</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}{lead.customer ? ` — ${lead.customer.companyName}` : ''}
                  </option>
                ))}
              </select>
            )}
            <FieldError message={errors.leadId?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Valid Until</label>
              <input
                {...register('validUntil')}
                type="date"
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Tax Rate (%)</label>
              <input
                {...register('taxRate')}
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={fieldClass()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Any notes for this quote…"
              className={`${fieldClass()} resize-none`}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
            <h2 className="text-sm font-semibold text-gray-300">Line Items</h2>
            <button
              type="button"
              onClick={() => append({ description: '', qty: 1, unitPrice: 0, discount: 0 })}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Plus size={13} />
              Add Item
            </button>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[1fr_72px_100px_72px_32px] gap-2 px-4 py-2 border-b border-[#1a1a1a] bg-[#0d0d0d]">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Description</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Qty</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider text-right">Unit Price</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Disc %</span>
            <span />
          </div>

          <div className="divide-y divide-[#1a1a1a]">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_72px_100px_72px_32px] gap-2 px-4 py-2.5 items-center">
                <div>
                  <input
                    {...register(`lineItems.${index}.description`)}
                    placeholder="Description…"
                    className="w-full px-2 py-1.5 text-sm bg-transparent border border-[#2a2a2a] rounded text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <FieldError message={errors.lineItems?.[index]?.description?.message} />
                </div>
                <input
                  {...register(`lineItems.${index}.qty`)}
                  type="number"
                  min="1"
                  className="w-full px-2 py-1.5 text-sm bg-transparent border border-[#2a2a2a] rounded text-gray-300 text-center focus:outline-none focus:border-amber-500/50"
                />
                <input
                  {...register(`lineItems.${index}.unitPrice`)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-sm bg-transparent border border-[#2a2a2a] rounded text-gray-300 text-right focus:outline-none focus:border-amber-500/50"
                />
                <input
                  {...register(`lineItems.${index}.discount`)}
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-sm bg-transparent border border-[#2a2a2a] rounded text-gray-300 text-center focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="p-1 text-gray-700 hover:text-red-400 disabled:opacity-20 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 py-4 border-t border-[#262626] space-y-1.5 bg-[#0d0d0d]">
            <div className="flex justify-end gap-8 text-sm text-gray-400">
              <span>Subtotal</span>
              <span className="w-32 text-right">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-end gap-8 text-sm text-gray-400">
              <span>Tax ({taxRate ?? 7}%)</span>
              <span className="w-32 text-right">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-end gap-8 text-base font-bold border-t border-[#262626] pt-2 mt-2">
              <span className="text-gray-200">Total</span>
              <span className="w-32 text-right text-amber-400">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <FieldError message={errors.lineItems?.root?.message ?? (errors.lineItems as { message?: string } | undefined)?.message} />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/quotes')}
            className="px-4 py-2.5 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Create Quote</>}
          </button>
        </div>
      </form>
    </div>
  )
}
