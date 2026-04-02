'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiGet, apiPatch } from '@/lib/apiClient'
import { formatCurrency, formatDate } from '@/utils/format'
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge'
import { useAuthStore } from '@/store/authStore'
import { ArrowLeft, Download, Send, CheckCircle, XCircle, Clock } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  discount: number
  subtotal: number
  product?: { modelName: string; sku?: string | null }
}

interface Quote {
  id: string
  quoteNumber: string
  version: number
  status: string
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  validUntil?: string | null
  notes?: string | null
  createdAt: string
  lineItems: LineItem[]
  lead?: {
    id: string
    title: string
    customer?: { companyName: string; billingAddress?: string | null }
  }
}

const TRANSITIONS: Record<string, Array<{ status: string; label: string; icon: React.ElementType; className: string }>> = {
  DRAFT: [{ status: 'SENT', label: 'Send Quote', icon: Send, className: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' }],
  SENT: [
    { status: 'ACCEPTED', label: 'Mark Accepted', icon: CheckCircle, className: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' },
    { status: 'REJECTED', label: 'Mark Rejected', icon: XCircle, className: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' },
    { status: 'EXPIRED', label: 'Mark Expired', icon: Clock, className: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' },
  ],
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Quote>(`/api/quotes/${id}`)
      setQuote(data)
    } catch { router.push('/quotes') } finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function transition(status: string) {
    if (!quote || transitioning) return
    setTransitioning(true)
    try {
      const updated = await apiPatch<Quote>(`/api/quotes/${id}`, { status })
      setQuote(updated)
    } catch { /* ignore */ } finally { setTransitioning(false) }
  }

  if (loading || !quote) {
    return <div className="p-6 text-gray-600 animate-pulse">Loading…</div>
  }

  const actions = TRANSITIONS[quote.status] ?? []
  const canEdit = quote.status === 'DRAFT' && (user?.role !== 'REP' || true)

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      {/* Back */}
      <Link href="/quotes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ArrowLeft size={14} /> Back to Quotes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-gray-100 font-mono">{quote.quoteNumber}</h1>
            <span className="text-xs text-gray-500">v{quote.version}</span>
            <QuoteStatusBadge status={quote.status} />
          </div>
          {quote.lead && (
            <Link href={`/leads/${quote.lead.id}`} className="text-sm text-amber-400/80 hover:text-amber-400">
              {quote.lead.title} — {quote.lead.customer?.companyName}
            </Link>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Created {formatDate(quote.createdAt)}
            {quote.validUntil && ` · Valid until ${formatDate(quote.validUntil)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => transition(action.status)}
              disabled={transitioning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${action.className}`}
            >
              <action.icon size={12} />
              {action.label}
            </button>
          ))}
          <a
            href={`/api/quotes/${id}/pdf`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#262626] text-xs text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] transition-colors"
          >
            <Download size={12} />
            PDF
          </a>
        </div>
      </div>

      {/* Bill To */}
      {quote.lead?.customer && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Bill To</h2>
          <p className="text-gray-200 font-medium">{quote.lead.customer.companyName}</p>
          {quote.lead.customer.billingAddress && (
            <p className="text-gray-500 text-sm mt-1">{quote.lead.customer.billingAddress}</p>
          )}
        </div>
      )}

      {/* Line Items */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#262626]">
          <h2 className="text-sm font-semibold text-gray-300">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#262626]">
              <th className="px-4 py-2.5 text-left">Description</th>
              <th className="px-4 py-2.5 text-center w-16">Qty</th>
              <th className="px-4 py-2.5 text-right w-28">Unit Price</th>
              <th className="px-4 py-2.5 text-center w-20 hidden sm:table-cell">Disc %</th>
              <th className="px-4 py-2.5 text-right w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-[#1a1a1a]">
                <td className="px-4 py-3 text-gray-300">
                  {item.description}
                  {item.product?.sku && <span className="text-gray-600 ml-2 text-xs">({item.product.sku})</span>}
                </td>
                <td className="px-4 py-3 text-center text-gray-400">{item.qty}</td>
                <td className="px-4 py-3 text-right text-gray-400">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">
                  {item.discount > 0 ? `${item.discount}%` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-200">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="px-4 py-4 border-t border-[#262626] space-y-1.5">
          <div className="flex justify-end gap-8 text-sm text-gray-400">
            <span>Subtotal</span>
            <span className="w-28 text-right">{formatCurrency(quote.subtotal)}</span>
          </div>
          {quote.discount > 0 && (
            <div className="flex justify-end gap-8 text-sm text-gray-400">
              <span>Discount</span>
              <span className="w-28 text-right text-red-400">-{formatCurrency(quote.discount)}</span>
            </div>
          )}
          <div className="flex justify-end gap-8 text-sm text-gray-400">
            <span>Tax ({quote.taxRate}%)</span>
            <span className="w-28 text-right">{formatCurrency(quote.taxAmount)}</span>
          </div>
          <div className="flex justify-end gap-8 text-base font-bold border-t border-[#262626] pt-2 mt-2">
            <span className="text-gray-200">Total</span>
            <span className="w-28 text-right text-amber-400">{formatCurrency(quote.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes</h2>
          <p className="text-gray-400 text-sm whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
    </div>
  )
}
