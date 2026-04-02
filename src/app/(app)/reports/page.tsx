'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { apiGet } from '@/lib/apiClient'
import { formatCurrency, formatCurrencyShort, formatPercent } from '@/utils/format'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

type Period = 'this_month' | 'last_month' | 'this_quarter' | 'custom'
type ReportType = 'pipeline' | 'performance' | 'brands'

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6', CONTACTED: '#a855f7', SITE_VISIT_SCHEDULED: '#eab308',
  QUOTE_SENT: '#f97316', NEGOTIATION: '#ef4444', CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#6b7280', ON_HOLD: '#64748b',
}
const PIE_COLORS = ['#fbbf24', '#3b82f6', '#22c55e', '#a855f7']

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: [Period, string][] = [
    ['this_month', 'This Month'], ['last_month', 'Last Month'], ['this_quarter', 'This Quarter'],
  ]
  return (
    <div className="flex gap-2">
      {opts.map(([p, label]) => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${value === p ? 'bg-amber-400 text-black' : 'bg-[#111111] border border-[#262626] text-gray-400 hover:text-gray-200'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<ReportType>('pipeline')
  const [period, setPeriod] = useState<Period>('this_month')
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<Record<string, unknown>>(`/api/reports?type=${tab}&period=${period}`)
      setData(res)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [tab, period])

  useEffect(() => { load() }, [load])

  const tabs: [ReportType, string][] = [
    ['pipeline', 'Pipeline'],
    ['performance', 'Performance'],
    ...((user?.role === 'PRODUCT_MANAGER' || user?.role === 'ADMIN') ? [['brands', 'Brands'] as [ReportType, string]] : []),
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Tabs + Period */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-[#111111] border border-[#262626] rounded-lg p-1">
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading && (
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[#111111] border border-[#262626] rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && data && tab === 'pipeline' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Leads by Status</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byStatus as unknown[]} margin={{ left: -20 }}>
                <XAxis dataKey="status" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v: string) => v.replace('_', ' ').substring(0, 10)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: 8 }} />
                <Bar dataKey="_count.id" name="Leads" radius={[4, 4, 0, 0]}>
                  {(data.byStatus as { status: string }[]).map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#fbbf24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Leads by Service Line</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byServiceLine as unknown[]} dataKey="_count.id" nameKey="serviceLine" cx="50%" cy="50%" outerRadius={80} label={(props) => (props as unknown as { serviceLine: string }).serviceLine}>
                  {(data.byServiceLine as { serviceLine: string }[]).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {['MANAGER', 'ADMIN'].includes(user?.role ?? '') && Array.isArray(data.byRep) && data.byRep.length > 0 && (
            <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 md:col-span-2">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Leads by Rep</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byRep as unknown[]} margin={{ left: -10 }}>
                  <XAxis dataKey="repName" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: 8 }} />
                  <Bar dataKey="_count.id" name="Leads" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {!loading && data && tab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Win Rate by Rep</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.data as unknown[]} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} unit="%" />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: 8 }} formatter={(v) => `${(v as number).toFixed(1)}%`} />
                <Bar dataKey="winRate" name="Win Rate" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#262626]">
              <h2 className="text-sm font-semibold text-gray-300">Revenue vs Target</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-[#262626]">
                  <th className="px-4 py-2.5 text-left">Rep</th>
                  <th className="px-4 py-2.5 text-right">Won</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                  <th className="px-4 py-2.5 text-right">Target</th>
                  <th className="px-4 py-2.5 text-right">Attainment</th>
                </tr>
              </thead>
              <tbody>
                {(data.data as { id: string; name: string; wonDeals: number; revenue: number; target: number; attainment: number }[]).map((row) => (
                  <tr key={row.id} className="border-b border-[#1a1a1a]">
                    <td className="px-4 py-2.5 text-gray-300">{row.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{row.wonDeals}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{formatCurrencyShort(row.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{row.target > 0 ? formatCurrencyShort(row.target) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${row.attainment >= 100 ? 'text-green-400' : row.attainment >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                      {row.target > 0 ? formatPercent(row.attainment) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data && tab === 'brands' && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#262626]">
            <h2 className="text-sm font-semibold text-gray-300">Brand Performance</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-[#262626]">
                <th className="px-4 py-2.5 text-left">Brand</th>
                <th className="px-4 py-2.5 text-right">Leads</th>
                <th className="px-4 py-2.5 text-right">Quote Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data.data as { id: string; name: string; leadCount: number; quoteRevenue: number }[]).map((row) => (
                <tr key={row.id} className="border-b border-[#1a1a1a]">
                  <td className="px-4 py-2.5 text-gray-300 font-medium">{row.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{row.leadCount}</td>
                  <td className="px-4 py-2.5 text-right text-amber-400">{formatCurrency(row.quoteRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
