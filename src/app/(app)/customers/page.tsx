'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, Building2, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiDelete } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'
import { formatRelativeDate } from '@/utils/format'
import type { Customer, CustomerTier, CustomerIndustry, PaginatedResponse } from '@/types'

const TIER_COLORS: Record<CustomerTier, string> = {
  PROSPECT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  VIP: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  INACTIVE: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const INDUSTRY_LABELS: Record<CustomerIndustry, string> = {
  CONSTRUCTION: 'Construction',
  INDUSTRIAL_FACTORY: 'Industrial / Factory',
  OTHER: 'Other',
}

const TIER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Tiers' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'VIP', label: 'VIP' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Industries' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'INDUSTRIAL_FACTORY', label: 'Industrial / Factory' },
  { value: 'OTHER', label: 'Other' },
]

function TierBadge({ tier }: { tier: CustomerTier }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider', TIER_COLORS[tier])}>
      {tier}
    </span>
  )
}

export default function CustomersPage() {
  const { user } = useAuthStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tier, setTier] = useState('')
  const [industry, setIndustry] = useState('')

  const isAdmin = user?.role === 'ADMIN'
  const PAGE_SIZE = 20

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (tier) params.set('tier', tier)
      if (industry) params.set('industry', industry)
      const res = await apiGet<PaginatedResponse<Customer>>(`/api/customers?${params.toString()}`)
      setCustomers(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, tier, industry])

  useEffect(() => { setPage(1) }, [debouncedSearch, tier, industry])
  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete "${c.companyName}"?\n\nThis will permanently remove the customer and all associated data.`)) return
    setDeletingId(c.id)
    try {
      await apiDelete(`/api/customers/${c.id}`)
      setCustomers((prev) => prev.filter((x) => x.id !== c.id))
      setTotal((t) => t - 1)
    } catch {
      alert('Failed to delete customer')
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
            Customers
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> New Customer
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by company name, tax ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111111] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-400/50 transition-colors"
          />
        </div>
        <select value={tier} onChange={(e) => setTier(e.target.value)}
          className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-400/50 transition-colors">
          {TIER_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#111111]">{o.label}</option>)}
        </select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)}
          className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-400/50 transition-colors">
          {INDUSTRY_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#111111]">{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#1a1a1a]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 bg-[#1e1e1e] rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-[#1e1e1e] rounded w-48" />
                  <div className="h-3 bg-[#1e1e1e] rounded w-32" />
                </div>
                <div className="h-5 bg-[#1e1e1e] rounded w-16" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 size={32} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">No customers found</p>
            {(search || tier || industry) && (
              <button onClick={() => { setSearch(''); setTier(''); setIndustry('') }}
                className="mt-2 text-xs text-amber-400 hover:text-amber-300">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider">Company</th>
                  <th className="text-left text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden md:table-cell">Industry</th>
                  <th className="text-left text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider">Tier</th>
                  <th className="text-right text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">Leads</th>
                  <th className="text-right text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">Sites</th>
                  <th className="text-right text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden lg:table-cell">Added</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#161616] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#1e1e1e] border border-[#262626] flex items-center justify-center flex-shrink-0">
                          <Building2 size={14} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="text-gray-200 font-medium">{c.companyName}</p>
                          {c.taxId && <p className="text-gray-600 text-xs">TIN: {c.taxId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                      {INDUSTRY_LABELS[c.industry]}
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={c.tier} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                      {c._count?.leads ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                      {c._count?.sites ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs hidden lg:table-cell">
                      {formatRelativeDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/customers/${c.id}`}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-200 hover:bg-[#1e1e1e] rounded-lg transition-colors">
                          View
                        </Link>
                        <Link href={`/customers/${c.id}/edit`}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-amber-400 hover:bg-amber-400/5 rounded-lg transition-colors">
                          <Pencil size={11} /> Edit
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
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
          <p className="text-xs text-gray-600">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
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
