'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/apiClient'
import { formatCurrency, formatDate } from '@/utils/format'
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge'
import { Plus, FileText } from 'lucide-react'

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

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (status) params.set('status', status)
      const res = await apiGet<Response>(`/api/quotes?${params}`)
      setQuotes(res.data)
      setTotalPages(res.totalPages)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [status])

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-300 outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
        <div className="flex-1" />
        <Link
          href="/leads"
          className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={14} />
          New Quote
        </Link>
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading…</div>
        ) : quotes.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            No quotes found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Quote #</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Lead</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Customer</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`} className="text-amber-400 hover:underline font-mono text-xs">
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs bg-[#111111] border border-[#262626] rounded-lg text-gray-400 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs bg-[#111111] border border-[#262626] rounded-lg text-gray-400 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
