'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Globe,
  FileText,
  Users,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Pencil,
  ExternalLink,
} from 'lucide-react'
import { apiGet } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { formatDate, formatRelativeDate, formatCurrency, formatStatus } from '@/utils/format'
import type { Customer, CustomerSite, Lead, CustomerTier, LeadStatus } from '@/types'

interface CustomerDetail extends Customer {
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SiteCard({
  site,
}: {
  site: CustomerDetail['sites'][number]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-[#262626] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#161616] transition-colors text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-200">{site.siteName}</p>
          <p className="text-xs text-gray-500">
            {site.siteType.replace(/_/g, ' ')}
            {site.province ? ` · ${site.province}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
          <span className="text-xs">{site.contacts.length} contact{site.contacts.length !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#1a1a1a] px-3 py-2 space-y-2">
          {site.address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <MapPin size={12} className="mt-0.5 flex-shrink-0 text-gray-600" />
              <span>{site.address}</span>
            </div>
          )}
          {site.projectStartDate && (
            <p className="text-xs text-gray-500">
              Project: {formatDate(site.projectStartDate)}
              {site.projectEndDate ? ` – ${formatDate(site.projectEndDate)}` : ''}
            </p>
          )}
          {site.contacts.length === 0 ? (
            <p className="text-xs text-gray-600 py-1">No contacts listed</p>
          ) : (
            <div className="space-y-1.5 pt-1">
              {site.contacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-gray-300">{contact.name}</p>
                      {contact.isPrimary && (
                        <span className="text-[9px] text-amber-400 border border-amber-400/30 rounded px-1 py-0 uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                    {contact.title && <p className="text-[11px] text-gray-500">{contact.title}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-gray-600 hover:text-amber-400 transition-colors">
                        <Phone size={11} />
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-gray-600 hover:text-amber-400 transition-colors">
                        <Mail size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiGet<CustomerDetail>(`/api/customers/${id}`)
      .then(setCustomer)
      .catch((err) => {
        console.error(err)
        setError('Failed to load customer')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#1e1e1e] rounded w-32" />
        <div className="h-32 bg-[#111111] border border-[#262626] rounded-xl" />
        <div className="h-48 bg-[#111111] border border-[#262626] rounded-xl" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 text-sm">{error ?? 'Customer not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-amber-400 hover:text-amber-300">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg border border-[#262626] text-gray-500 hover:text-gray-300 hover:border-[#333] transition-colors"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1
              className="text-xl font-bold text-gray-100"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {customer.companyName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider',
                  TIER_COLORS[customer.tier]
                )}
              >
                {customer.tier}
              </span>
              <span className="text-xs text-gray-500">
                {customer.industry.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/customers/${id}/edit`}
          className="flex items-center gap-1.5 border border-[#262626] hover:border-[#333] text-gray-400 hover:text-gray-200 text-xs px-3 py-2 rounded-lg transition-colors"
        >
          <Pencil size={12} />
          Edit
        </Link>
      </div>

      {/* Info Card */}
      <Section title="Company Info">
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
                <a
                  href={customer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
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
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Leads</p>
              <p className="text-sm text-gray-300">{customer._count?.leads ?? customer.leads.length}</p>
            </div>
            <div className="w-px h-8 bg-[#262626]" />
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Sites</p>
              <p className="text-sm text-gray-300">{customer._count?.sites ?? customer.sites.length}</p>
            </div>
          </div>
          {customer.notes && (
            <div className="sm:col-span-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Notes</p>
              <p className="text-sm text-gray-400 whitespace-pre-line">{customer.notes}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Sites */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <MapPin size={14} className="text-gray-600" />
            Sites
            <span className="text-xs text-gray-600 font-normal">({customer.sites.length})</span>
          </h2>
          <Link
            href={`/customers/${id}/sites/new`}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            + Add site
          </Link>
        </div>
        <div className="p-4 space-y-2">
          {customer.sites.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">No sites added yet</p>
          ) : (
            customer.sites.map((site) => <SiteCard key={site.id} site={site} />)
          )}
        </div>
      </div>

      {/* Lead History */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Users size={14} className="text-gray-600" />
            Recent Leads
            <span className="text-xs text-gray-600 font-normal">(last 10)</span>
          </h2>
          <Link
            href={`/leads/new?customerId=${id}`}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            + New lead
          </Link>
        </div>
        {customer.leads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-600">No leads yet</p>
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
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-gray-200 hover:text-amber-400 transition-colors font-medium"
                      >
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
                      {lead.assignedTo
                        ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                        : '—'}
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
    </div>
  )
}
