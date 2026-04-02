'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { apiGet } from '@/lib/apiClient'
import { formatCurrencyShort, formatCurrency, formatRelativeDate, formatDate } from '@/utils/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, TrendingUp, AlertCircle, DollarSign, Activity, Building, Package } from 'lucide-react'

function KPICard({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <Icon size={14} className={accent ? 'text-amber-400' : 'text-gray-600'} />
      </div>
      <p className="text-2xl font-bold text-gray-100" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    apiGet<Record<string, unknown>>('/api/dashboard').then(setData).catch(() => {})
  }, [])

  if (!data || !user) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111111] border border-[#262626] rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // REP Dashboard
  if (data.role === 'REP') {
    const kpis = data.kpis as Record<string, number>
    const stale = data.staleLeads as Array<Record<string, unknown>>
    const upcoming = data.upcoming as Array<Record<string, unknown>>

    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Open Leads" value={String(kpis.openLeads)} icon={Users} />
          <KPICard label="Pipeline Value" value={formatCurrencyShort(kpis.pipelineValue)} icon={TrendingUp} accent />
          <KPICard label="Activities This Week" value={String(kpis.activitiesThisWeek)} icon={Activity} />
          <KPICard label="Won This Month" value={formatCurrencyShort(kpis.wonThisMonth)} icon={DollarSign} accent />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Stale Leads</h2>
            {stale.length === 0 ? (
              <p className="text-gray-600 text-sm">No stale leads</p>
            ) : (
              <ul className="space-y-2">
                {stale.map((l: Record<string, unknown>) => (
                  <li key={l.id as string} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate">{l.title as string}</span>
                    <span className="text-gray-500 text-xs ml-2 flex-shrink-0">{formatRelativeDate(l.updatedAt as string)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Upcoming Activities</h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-600 text-sm">No upcoming activities</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((a: Record<string, unknown>) => {
                  const lead = a.lead as Record<string, unknown>
                  return (
                    <li key={a.id as string} className="text-sm">
                      <p className="text-gray-300">{a.subject as string}</p>
                      <p className="text-gray-500 text-xs">{formatDate(a.scheduledAt as string)} · {(lead?.title as string) ?? ''}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    )
  }

  // MANAGER Dashboard
  if (data.role === 'MANAGER') {
    const kpis = data.kpis as Record<string, number>
    const team = data.teamPerformance as Array<Record<string, unknown>>
    const byStatus = data.pipelineByStatus as Array<{ status: string; _count: { id: number }; _sum: { dealValue: number } }>

    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Total Pipeline" value={formatCurrencyShort(kpis.totalPipeline)} icon={TrendingUp} accent />
          <KPICard label="Win Rate" value={`${kpis.winRate?.toFixed(1)}%`} icon={DollarSign} />
          <KPICard label="Overdue Follow-ups" value={String(kpis.overdueFollowUps)} icon={AlertCircle} />
          <KPICard label="Won This Month" value={formatCurrencyShort(kpis.wonThisMonth)} icon={DollarSign} accent />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Pipeline by Status</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byStatus} margin={{ left: -20 }}>
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => v.replace('_', ' ').substring(0, 8)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: 8 }} formatter={(v) => formatCurrency(v as number)} />
                <Bar dataKey="_count.id" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Team Performance</h2>
            <div className="space-y-2">
              {team.map((m: Record<string, unknown>) => (
                <div key={m.id as string} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{m.name as string}</span>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>{m.openLeads as number} leads</span>
                    <span className="text-amber-400">{formatCurrencyShort(m.pipelineValue as number)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // PRODUCT_MANAGER Dashboard
  if (data.role === 'PRODUCT_MANAGER') {
    const brands = data.brandStats as Array<Record<string, unknown>>
    const notes = data.recentNotes as Array<Record<string, unknown>>

    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Assigned Brands</h2>
            {brands.map((b: Record<string, unknown>) => (
              <div key={b.id as string} className="flex items-center gap-2 py-2 border-b border-[#1a1a1a] last:border-0">
                <Package size={14} className="text-amber-400" />
                <span className="text-gray-200 text-sm">{b.name as string}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Product Notes</h2>
            {notes.length === 0 ? (
              <p className="text-gray-600 text-sm">No recent notes</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n: Record<string, unknown>) => {
                  const author = n.author as Record<string, unknown>
                  const lead = n.lead as Record<string, unknown>
                  return (
                    <li key={n.id as string} className="text-sm">
                      <p className="text-gray-300 line-clamp-1">{n.content as string}</p>
                      <p className="text-gray-500 text-xs">{author.firstName as string} · {lead.title as string}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ADMIN Dashboard
  const kpis = data.kpis as Record<string, number>
  const audit = data.recentAudit as Array<Record<string, unknown>>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Active Users" value={String(kpis.totalUsers)} icon={Users} />
        <KPICard label="Customers" value={String(kpis.totalCustomers)} icon={Building} />
        <KPICard label="Active Leads" value={String(kpis.activeLeads)} icon={TrendingUp} />
        <KPICard label="Revenue MTD" value={formatCurrencyShort(kpis.revenueMTD)} icon={DollarSign} accent />
      </div>

      <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Audit Activity</h2>
        <div className="space-y-2">
          {audit.map((entry: Record<string, unknown>) => {
            const u = entry.user as Record<string, unknown>
            return (
              <div key={entry.id as string} className="flex items-center gap-3 text-sm py-1 border-b border-[#1a1a1a] last:border-0">
                <span className="text-gray-500 text-xs w-32 flex-shrink-0">{formatRelativeDate(entry.createdAt as string)}</span>
                <span className="text-amber-400/80 text-xs w-16 flex-shrink-0">{entry.action as string}</span>
                <span className="text-gray-400 text-xs">{entry.entityType as string} by {u?.firstName as string}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
