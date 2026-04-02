'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, List, LayoutGrid, Download, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiGet } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { formatCurrencyShort, formatDate, formatStatus } from '@/utils/format'
import { StatusBadge, ServiceLineBadge, PriorityBadge } from '@/components/leads/StatusBadge'
import KanbanBoard from '@/components/leads/KanbanBoard'
import type { Lead, LeadStatus, ServiceLine, Priority, PaginatedResponse } from '@/types'
import { useAuthStore } from '@/store/authStore'

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUOTE_SENT',
  'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD',
]
const SERVICE_LINE_OPTIONS: ServiceLine[] = ['SALE', 'RENTAL', 'SERVICE']
const PRIORITY_OPTIONS: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function LeadsPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([])
  const [serviceLine, setServiceLine] = useState<ServiceLine | ''>('')
  const [priority, setPriority] = useState<Priority | ''>('')

  const debouncedSearch = useDebounce(search)
  const PAGE_SIZE = 25

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','))
    if (serviceLine) params.set('serviceLine', serviceLine)
    if (priority) params.set('priority', priority)
    return params.toString()
  }, [page, debouncedSearch, selectedStatuses, serviceLine, priority])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const qs = buildQuery()
      // For kanban, fetch all without pagination
      const kanbanQs = view === 'kanban' ? qs.replace(`page=${page}`, 'page=1').replace(`pageSize=${PAGE_SIZE}`, 'pageSize=200') : qs
      const res = await apiGet<PaginatedResponse<Lead>>(`/api/leads?${view === 'kanban' ? kanbanQs : qs}`)
      setLeads(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [buildQuery, view, page])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedStatuses, serviceLine, priority])

  function toggleStatus(s: LeadStatus) {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  function clearFilters() {
    setSearch('')
    setSelectedStatuses([])
    setServiceLine('')
    setPriority('')
  }

  const hasFilters = search || selectedStatuses.length > 0 || serviceLine || priority

  function handleExport() {
    const qs = buildQuery()
    window.location.href = `/api/leads/export?${qs}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-100">Leads</h1>
          {!loading && (
            <span className="text-xs text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-[#1a1a1a] border border-[#262626] rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'list' ? 'bg-[#262626] text-gray-200' : 'text-gray-600 hover:text-gray-400'
              )}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'kanban' ? 'bg-[#262626] text-gray-200' : 'text-gray-600 hover:text-gray-400'
              )}
              title="Kanban view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* New lead */}
          <Link
            href="/leads/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors"
          >
            <Plus size={14} />
            <span>New Lead</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 py-3 border-b border-[#1a1a1a] space-y-2">
        {/* Search + clear */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#111111] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Service line filter */}
          <select
            value={serviceLine}
            onChange={(e) => setServiceLine(e.target.value as ServiceLine | '')}
            className="text-xs bg-[#111111] border border-[#262626] rounded-lg px-2 py-1.5 text-gray-400 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Lines</option>
            {SERVICE_LINE_OPTIONS.map((sl) => (
              <option key={sl} value={sl}>{formatStatus(sl)}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority | '')}
            className="text-xs bg-[#111111] border border-[#262626] rounded-lg px-2 py-1.5 text-gray-400 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{formatStatus(p)}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] border transition-colors',
                selectedStatuses.includes(s)
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'border-[#262626] text-gray-600 hover:border-[#333333] hover:text-gray-400'
              )}
            >
              {formatStatus(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-[#111111] border border-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : view === 'kanban' ? (
          <div className="p-4">
            <KanbanBoard
              leads={leads}
              onLeadUpdated={(updated) => {
                setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
              }}
            />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <p className="text-sm">No leads found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-amber-500 hover:text-amber-400">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    {['Title', 'Customer', 'Status', 'Line', 'Priority', 'Deal Value', 'Close Date', 'Assigned To', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111111]">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#111111] transition-colors cursor-pointer"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-gray-200 font-medium truncate max-w-[220px]">{lead.title}</p>
                        {lead._count && (
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {lead._count.activities} activities · {lead._count.quotes} quotes
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-400 truncate max-w-[160px]">{lead.customer?.companyName}</p>
                        {lead.customer?.tier && (
                          <p className="text-[10px] text-gray-600">{lead.customer.tier}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <ServiceLineBadge serviceLine={lead.serviceLine} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={lead.priority} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-amber-400 font-medium whitespace-nowrap">
                        {lead.dealValue ? formatCurrencyShort(lead.dealValue) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(lead.expectedCloseDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {lead.assignedTo
                          ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-xs text-gray-600 hover:text-amber-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-600">
                  Page {page} of {totalPages} · {total} leads
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded text-gray-600 hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded text-gray-600 hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB for mobile */}
      <Link
        href="/leads/new"
        className="fixed bottom-6 right-6 md:hidden w-12 h-12 bg-amber-400 text-black rounded-full flex items-center justify-center shadow-lg hover:bg-amber-300 transition-colors z-20"
        aria-label="New lead"
      >
        <Plus size={20} />
      </Link>
    </div>
  )
}
