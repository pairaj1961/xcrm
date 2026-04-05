'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { apiGet, apiDelete } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/utils/format'
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge'
import { Plus, FileText, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  total: number
  createdAt: string
  validUntil?: string | null
  lead?: { id: string; title: string; customer?: { companyName: string } }
}

interface Response {
  data: Quote[]
  total: number
  totalPages: number
}

const STATUSES = ['', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']
const STATUS_LABELS: Record<string, string> = {
  '': 'All',
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
}

export default function QuotesPage() {
  const { user } = useAuthStore()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canDelete = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (status) params.set('status', status)
      const res = await apiGet<Response>(`/api/quotes?${params}`)
      setQuotes(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [status])

  async function handleDelete(q: Quote) {
    if (!confirm(`Delete quote ${q.quoteNumber}?`)) return
    setDeletingId(q.id)
    try {
      await apiDelete(`/api/quotes/${q.id}`)
      setQuotes((prev) => prev.filter((x) => x.id !== q.id))
      setTotal((t) => t - 1)
    } catch {
      alert('Failed to delete quote')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Quotes
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{total} total</p>
        </div>
        <Link href="/quotes/new"
          className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-lg text-sm font-semibold transition-colors">
          <Plus size={14} /> New Quote
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              status === s
                ? 'bg-amber-400 text-black'
                : 'bg-[#111111] border border-[#262626] text-gray-400 hover:text-gray-200 hover:border-[#333]'
            )}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#1a1a1a]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="h-4 bg-[#1e1e1e] rounded w-24" />
                <div className="flex-1 h-4 bg-[#1e1e1e] rounded" />
                <div className="h-5 bg-[#1e1e1e] rounded w-16" />
                <div className="h-4 bg-[#1e1e1e] rounded w-20" />
              </div>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto mb-2 text-gray-700" />
            <p className="text-gray-500 text-sm">No quotes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-xs text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-medium">Quote #</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Lead</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Customer</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Valid Until</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-[#161616] transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/quotes/${q.id}`} className="text-amber-400 hover:underline font-mono text-xs font-medium">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-300 truncate max-w-[160px]">
                      {q.lead?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400 truncate max-w-[140px]">
                      {q.lead?.customer?.companyName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <QuoteStatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-200">
                      {formatCurrency(q.total)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {formatDate(q.createdAt)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {q.validUntil ? formatDate(q.validUntil) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/quotes/${q.id}`}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-200 hover:bg-[#1e1e1e] rounded-lg transition-colors">
                          View
                        </Link>
                        {canDelete && q.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDelete(q)}
                            disabled={deletingId === q.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#262626] text-gray-500 hover:text-gray-300 hover:border-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#262626] text-gray-500 hover:text-gray-300 hover:border-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
