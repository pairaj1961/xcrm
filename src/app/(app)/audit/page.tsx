'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiGet } from '@/lib/apiClient'
import { formatDate, formatRelativeDate } from '@/utils/format'
import { cn } from '@/lib/cn'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  oldValue?: string | null
  newValue?: string | null
  ipAddress?: string | null
  createdAt: string
  user?: { firstName: string; lastName: string; email: string }
}

interface Response {
  data: AuditEntry[]
  total: number
  totalPages: number
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-400 bg-green-500/10',
  UPDATE: 'text-blue-400 bg-blue-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
}

const ENTITY_TYPES = ['', 'Lead', 'Customer', 'Quote', 'User', 'Product', 'ProductManagerBrand', 'Settings']

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [entityType, setEntityType] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' })
      if (entityType) params.set('entityType', entityType)
      const res = await apiGet<Response>(`/api/audit?${params}`)
      setEntries(res.data)
      setTotalPages(res.totalPages)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [page, entityType])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [entityType])

  function formatJson(str?: string | null) {
    if (!str) return null
    try { return JSON.stringify(JSON.parse(str), null, 2) }
    catch { return str }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-300 outline-none"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t || 'All Types'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No audit entries</div>
        ) : (
          <div>
            {entries.map((entry) => (
              <div key={entry.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] hover:bg-[#1a1a1a] cursor-pointer transition-colors text-sm"
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                >
                  <span className="text-gray-500 text-xs w-28 flex-shrink-0">{formatRelativeDate(entry.createdAt)}</span>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium flex-shrink-0', ACTION_COLORS[entry.action] ?? 'text-gray-400 bg-gray-500/10')}>
                    {entry.action}
                  </span>
                  <span className="text-amber-400/80 text-xs flex-shrink-0 w-24">{entry.entityType}</span>
                  <span className="text-gray-400 flex-1 truncate">
                    {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System'}
                  </span>
                  <span className="text-gray-600 text-xs font-mono flex-shrink-0 hidden md:block">{entry.entityId.substring(0, 8)}…</span>
                  {(entry.oldValue || entry.newValue) ? (
                    expanded === entry.id ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />
                  ) : <div className="w-3.5" />}
                </div>

                {expanded === entry.id && (entry.oldValue || entry.newValue) && (
                  <div className="px-4 py-3 bg-[#0d0d0d] border-b border-[#1a1a1a] grid md:grid-cols-2 gap-4">
                    {entry.oldValue && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Before</p>
                        <pre className="text-xs text-red-300/80 bg-red-500/5 rounded p-2 overflow-auto max-h-40 border border-red-500/10">
                          {formatJson(entry.oldValue)}
                        </pre>
                      </div>
                    )}
                    {entry.newValue && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">After</p>
                        <pre className="text-xs text-green-300/80 bg-green-500/5 rounded p-2 overflow-auto max-h-40 border border-green-500/10">
                          {formatJson(entry.newValue)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-xs bg-[#111111] border border-[#262626] rounded-lg text-gray-400 disabled:opacity-40">Prev</button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-xs bg-[#111111] border border-[#262626] rounded-lg text-gray-400 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
