'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, Globe, FileText, Users, Phone, Mail,
  Pencil, ExternalLink, Trash2, Plus, UserCircle,
} from 'lucide-react'
import { apiGet, apiDelete } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'
import { formatDate, formatRelativeDate, formatCurrency, formatStatus } from '@/utils/format'
import type { Customer, CustomerSite, Lead, CustomerTier, LeadStatus } from '@/types'

interface CustomerDetail extends Customer {
  assignedRep?: { id: string; firstName: string; lastName: string } | null
  sites: (CustomerSite & {
    contacts: {
      id: string
      name: string
      title?: string | null
      phone?: string | null
      email?: string | null
      isPrimary: boolean
    }[]
  })[]
  leads: (Lead & {
    assignedTo: { firstName: string; lastName: string }
  })[]
}

const TIER_COLORS: Record<CustomerTier, string> = {
  PROSPECT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  VIP: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  INACTIVE: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'text-blue-400',
  CONTACTED: 'text-sky-400',
  SITE_VISIT_SCHEDULED: 'text-violet-400',
  QUOTE_SENT: 'text-amber-400',
  NEGOTIATION: 'text-orange-400',
  CLOSED_WON: 'text-green-400',
  CLOSED_LOST: 'text-red-400',
  ON_HOLD: 'text-gray-500',
}

const SITE_TYPE_LABELS: Record<string, string> = {
  CONSTRUCTION_SITE: 'Construction',
  FACTORY: 'Factory',
  WAREHOUSE: 'Warehouse',
  OFFICE: 'Office',
  OTHER: 'Other',
}

type Tab = 'info' | 'sites' | 'leads'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [isPending, startTransition] = useTransition()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('info')
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    if (!id) return
    startTransition(async () => {
      try {
        const data = await apiGet<CustomerDetail>(`/api/customers/${id}`)
        setCustomer(data)
        setError(null)
      } catch (err) {
        console.error(err)
        setError('Failed to load customer')
      }
    })
  }, [id])

  async function handleDeleteSite(siteId: string, siteName: string) {
    if (!confirm(`Delete site "${siteName}"?`)) return
    setDeletingSiteId(siteId)
    try {
      await apiDelete(`/api/customers/${id}/sites/${siteId}`)
      setCustomer((prev) => prev ? {
        ...prev,
        sites: prev.sites.filter((s) => s.id !== siteId),
      } : prev)
    } catch {
      alert('Failed to delete site')
    } finally {
      setDeletingSiteId(null)
    }
  }

  async function handleDeleteCustomer() {
    if (!customer) return
    if (!confirm(`Delete "${customer.companyName}"?\n\nThis will permanently remove the customer and all associated data.`)) return
    setDeletingCustomer(true)
    try {
      await apiDelete(`/api/customers/${id}`)
      router.push('/customers')
    } catch {
      alert('Failed to delete customer')
      setDeletingCustomer(false)
    }
  }

  if (isPending || (customer === null && error === null)) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-28 bg-[#111111] border border-[#262626] rounded-xl" />
        <div className="h-10 bg-[#111111] border border-[#262626] rounded-xl" />
        <div className="h-48 bg-[#111111] border border-[#262626] rounded-xl" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 text-sm">{error ?? 'Customer not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-amber-400 hover:text-amber-300">Go back</button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      {/* Header Card */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex items-start gap-4">
        <button onClick={() => router.back()}
          className="p-1.5 rounded-lg border border-[#262626] text-gray-500 hover:text-gray-300 hover:border-[#333] transition-colors flex-shrink-0 mt-0.5">
          <ArrowLeft size={14} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center flex-shrink-0">
          <Building2 size={18} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-100" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {customer.companyName}
            </h1>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider', TIER_COLORS[customer.tier])}>
              {customer.tier}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{customer.industry.replace(/_/g, ' ')}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-600">
            <span>{customer._count?.leads ?? customer.leads.length} leads</span>
            <span>·</span>
            <span>{customer._count?.sites ?? customer.sites.length} sites</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Link href={`/customers/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#262626] hover:border-[#333] text-gray-400 hover:text-gray-200 rounded-lg transition-colors">
            <Pencil size={11} /> Edit
          </Link>
          {isAdmin && (
            <button onClick={handleDeleteCustomer} disabled={deletingCustomer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40">
              <Trash2 size={11} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#111111] border border-[#262626] rounded-xl p-1 gap-1">
        {([
          ['info', 'Company Info'],
          ['sites', `Sites (${customer.sites.length})`],
          ['leads', `Leads (${customer.leads.length})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-2 text-xs font-medium rounded-lg transition-colors',
              tab === t ? 'bg-[#1e1e1e] text-gray-200' : 'text-gray-500 hover:text-gray-300'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'info' && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customer.billingAddress && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Address</p>
                  <p className="text-sm text-gray-300 whitespace-pre-line">{customer.billingAddress}</p>
                </div>
              </div>
            )}
            {customer.website && (
              <div className="flex items-start gap-2">
                <Globe size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Website</p>
                  <a href={customer.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
                    {customer.website.replace(/^https?:\/\//, '')}
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            )}
            {customer.taxId && (
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Tax ID</p>
                  <p className="text-sm text-gray-300">{customer.taxId}</p>
                </div>
              </div>
            )}
            {customer.registrationNumber && (
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Registration No.</p>
                  <p className="text-sm text-gray-300">{customer.registrationNumber}</p>
                </div>
              </div>
            )}
            {customer.notes && (
              <div className="sm:col-span-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Notes</p>
                <p className="text-sm text-gray-400 whitespace-pre-line">{customer.notes}</p>
              </div>
            )}
            {customer.assignedRep && (
              <div className="flex items-start gap-2">
                <UserCircle size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Assigned Rep</p>
                  <p className="text-sm text-gray-300">{customer.assignedRep.firstName} {customer.assignedRep.lastName}</p>
                </div>
              </div>
            )}
            {!customer.billingAddress && !customer.website && !customer.taxId && !customer.registrationNumber && !customer.notes && !customer.assignedRep && (
              <p className="text-sm text-gray-600 col-span-2">No additional info</p>
            )}
          </div>
        </div>
      )}

      {/* Sites Tab */}
      {tab === 'sites' && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <span className="text-xs text-gray-500">{customer.sites.length} site{customer.sites.length !== 1 ? 's' : ''}</span>
            <Link href={`/customers/${id}/sites/new`}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
              <Plus size={12} /> Add Site
            </Link>
          </div>
          {customer.sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin size={28} className="text-gray-700 mb-2" />
              <p className="text-sm text-gray-500">No sites yet</p>
              <Link href={`/customers/${id}/sites/new`}
                className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                + Add first site
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider">Site Name</th>
                  <th className="text-left text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="text-left text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden md:table-cell">Province</th>
                  <th className="text-center text-xs text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">Contacts</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {customer.sites.map((site) => (
                  <tr key={site.id} className="hover:bg-[#161616] transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-200 font-medium">{site.siteName}</p>
                      {(site.projectStartDate || site.projectEndDate) && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {site.projectStartDate ? formatDate(site.projectStartDate) : '?'}
                          {' – '}
                          {site.projectEndDate ? formatDate(site.projectEndDate) : 'ongoing'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-400 bg-[#1a1a1a] border border-[#262626] px-2 py-0.5 rounded">
                        {SITE_TYPE_LABELS[site.siteType] ?? site.siteType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">
                      {site.province ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {site.contacts.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {site.contacts.slice(0, 2).map((c) => (
                            <div key={c.id} className="flex items-center justify-center gap-1.5">
                              <span className="text-xs text-gray-400">{c.name}</span>
                              {c.phone && (
                                <a href={`tel:${c.phone}`} className="text-gray-600 hover:text-amber-400 transition-colors">
                                  <Phone size={10} />
                                </a>
                              )}
                              {c.email && (
                                <a href={`mailto:${c.email}`} className="text-gray-600 hover:text-amber-400 transition-colors">
                                  <Mail size={10} />
                                </a>
                              )}
                            </div>
                          ))}
                          {site.contacts.length > 2 && (
                            <span className="text-[10px] text-gray-600">+{site.contacts.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/customers/${id}/sites/${site.id}/edit`}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-amber-400 hover:bg-amber-400/5 rounded-lg transition-colors">
                          <Pencil size={11} /> Edit
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSite(site.id, site.siteName)}
                            disabled={deletingSiteId === site.id}
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
          )}
        </div>
      )}

      {/* Leads Tab */}
      {tab === 'leads' && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
              <Users size={14} className="text-gray-600" />
              Recent Leads
              <span className="text-xs text-gray-600 font-normal">(last 10)</span>
            </div>
            <Link href={`/leads/new?customerId=${id}`}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
              <Plus size={12} /> New Lead
            </Link>
          </div>
          {customer.leads.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-600">No leads yet</p>
              <Link href={`/leads/new?customerId=${id}`}
                className="mt-2 inline-block text-xs text-amber-400 hover:text-amber-300">
                Create first lead
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="text-left text-xs text-gray-600 font-medium px-4 py-2 uppercase tracking-wider">Title</th>
                    <th className="text-left text-xs text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden sm:table-cell">Status</th>
                    <th className="text-left text-xs text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden md:table-cell">Assigned</th>
                    <th className="text-right text-xs text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden md:table-cell">Value</th>
                    <th className="text-right text-xs text-gray-600 font-medium px-4 py-2 uppercase tracking-wider">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {customer.leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#161616] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/leads/${lead.id}`}
                          className="text-gray-200 hover:text-amber-400 transition-colors font-medium">
                          {lead.title}
                        </Link>
                        <p className="text-xs text-gray-600">{lead.serviceLine}</p>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <span className={cn('text-xs font-medium', STATUS_COLORS[lead.status])}>
                          {formatStatus(lead.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 hidden md:table-cell">
                        {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400 hidden md:table-cell">
                        {lead.dealValue != null ? formatCurrency(lead.dealValue) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                        {formatRelativeDate(lead.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
