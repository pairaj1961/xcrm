'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit2, Trash2, Plus, X, Check, Calendar, Building,
  MapPin, User, Tag, FileText, Package, Activity, Quote, StickyNote,
  ChevronDown,
} from 'lucide-react'
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, formatRelativeDate, formatStatus } from '@/utils/format'
import { StatusBadge, ServiceLineBadge, PriorityBadge } from '@/components/leads/StatusBadge'
import { useAuthStore } from '@/store/authStore'
import type {
  LeadDetail, Lead, Activity as ActivityType, LeadProduct,
  ProductNote, Tag as TagType, LeadStatus, QuoteSummary,
} from '@/types'

type Tab = 'overview' | 'products' | 'activities' | 'quotes' | 'notes' | 'tags'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'activities', label: 'Activities', icon: Activity },
  { id: 'quotes', label: 'Quotes', icon: Quote },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tags', label: 'Tags', icon: Tag },
]

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUOTE_SENT',
  'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#262626] rounded-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-600 text-center py-4">{message}</p>
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ lead }: { lead: LeadDetail }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Customer & Site */}
      <SectionCard title="Customer">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Building size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <Link
                href={`/customers/${lead.customerId}`}
                className="text-sm font-medium text-gray-200 hover:text-amber-400 transition-colors"
              >
                {lead.customer?.companyName}
              </Link>
              <p className="text-xs text-gray-600 mt-0.5">
                {(lead.customer as unknown as { tier: string })?.tier} · {(lead.customer as unknown as { industry: string })?.industry}
              </p>
            </div>
          </div>
          {lead.site && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-300">{(lead.site as unknown as { siteName: string }).siteName}</p>
                {(lead.site as unknown as { province?: string }).province && (
                  <p className="text-xs text-gray-600">{(lead.site as unknown as { province?: string }).province}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Lead details */}
      <SectionCard title="Details">
        <dl className="space-y-2.5">
          {[
            { label: 'Deal Value', value: lead.dealValue ? formatCurrency(lead.dealValue) : '—' },
            { label: 'Expected Close', value: formatDate(lead.expectedCloseDate) },
            { label: 'Assigned To', value: lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '—' },
            { label: 'Created By', value: lead.createdBy ? `${lead.createdBy.firstName} ${lead.createdBy.lastName}` : '—' },
            { label: 'Created', value: formatRelativeDate(lead.createdAt) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <dt className="text-gray-600">{label}</dt>
              <dd className="text-gray-300 text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      {/* Decision maker */}
      {(lead.decisionMakerName || lead.decisionMakerTitle) && (
        <SectionCard title="Decision Maker">
          <div className="flex items-center gap-3">
            <User size={16} className="text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-200">{lead.decisionMakerName}</p>
              {lead.decisionMakerTitle && (
                <p className="text-xs text-gray-600">{lead.decisionMakerTitle}</p>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Notes */}
      {lead.notes && (
        <SectionCard title="Notes">
          <p className="text-sm text-gray-400 leading-relaxed">{lead.notes}</p>
        </SectionCard>
      )}
    </div>
  )
}

// ── Products Tab ──────────────────────────────────────────────────────────────

function ProductsTab({ lead, canEdit }: { lead: LeadDetail; canEdit: boolean }) {
  const products: LeadProduct[] = (lead.products ?? []) as LeadProduct[]

  if (!canEdit && products.length === 0) return <EmptyState message="No products added" />

  return (
    <div className="space-y-2">
      {products.map((lp) => (
        <div
          key={lp.id}
          className="flex items-center justify-between px-4 py-3 bg-[#111111] border border-[#262626] rounded-lg"
        >
          <div>
            <p className="text-sm text-gray-200">{lp.product?.modelName ?? 'Unknown product'}</p>
            <p className="text-xs text-gray-600">
              {lp.product?.brand?.name ?? ''}{lp.product?.category?.name ? ` · ${lp.product.category.name}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-amber-400">{formatCurrency(lp.unitPrice)}</p>
            <p className="text-xs text-gray-600">Qty: {lp.quantity}</p>
          </div>
        </div>
      ))}
      {products.length === 0 && <EmptyState message="No products added" />}
    </div>
  )
}

// ── Activities Tab ────────────────────────────────────────────────────────────

function ActivitiesTab({ leadId, activities: initialActivities, canEdit }: {
  leadId: string
  activities: ActivityType[]
  canEdit: boolean
}) {
  const [activities, setActivities] = useState<ActivityType[]>(initialActivities)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ type: 'CALL', subject: '', scheduledAt: '', description: '' })

  async function handleCreate() {
    if (!form.subject) return
    setSubmitting(true)
    try {
      const activity = await apiPost<ActivityType>(`/api/leads/${leadId}/activities`, {
        type: form.type,
        subject: form.subject,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        description: form.description || null,
      })
      setActivities((prev) => [activity, ...prev])
      setShowForm(false)
      setForm({ type: 'CALL', subject: '', scheduledAt: '', description: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'SITE_VISIT', 'DEMO', 'QUOTE_SENT', 'MEETING', 'NOTE', 'TASK']

  return (
    <div className="space-y-3">
      {canEdit && (
        <div>
          {showForm ? (
            <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-gray-300 focus:outline-none"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>{formatStatus(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-gray-300 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subject *</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="What happened?"
                  className="w-full px-2 py-1.5 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-gray-300 placeholder-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-gray-300 placeholder-gray-600 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={submitting || !form.subject}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 transition-colors"
                >
                  {submitting ? '…' : <><Check size={12} /> Save</>}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 border border-[#262626] rounded-lg hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Plus size={14} /> Log Activity
            </button>
          )}
        </div>
      )}

      {activities.length === 0 && !showForm ? (
        <EmptyState message="No activities logged" />
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-[#262626]" />
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="relative flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center flex-shrink-0 z-10">
                  <span className="text-[9px] text-gray-500 font-medium">{a.type.substring(0, 3)}</span>
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm text-gray-200">{a.subject}</p>
                  {a.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                    <span>{a.user ? `${a.user.firstName} ${a.user.lastName}` : ''}</span>
                    <span>·</span>
                    <span>{formatRelativeDate(a.createdAt)}</span>
                    {a.scheduledAt && (
                      <>
                        <span>·</span>
                        <Calendar size={10} />
                        <span>{formatDate(a.scheduledAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Quotes Tab ────────────────────────────────────────────────────────────────

function QuotesTab({ lead, leadId }: { lead: LeadDetail; leadId: string }) {
  const quotes: QuoteSummary[] = (lead.quotes ?? []) as QuoteSummary[]

  const quoteStatusColors: Record<string, string> = {
    DRAFT: 'text-gray-400',
    SENT: 'text-blue-400',
    ACCEPTED: 'text-emerald-400',
    REJECTED: 'text-red-400',
    EXPIRED: 'text-orange-400',
  }

  return (
    <div className="space-y-3">
      <Link
        href={`/quotes/new?leadId=${leadId}`}
        className="inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
      >
        <Plus size={14} /> New Quote
      </Link>

      {quotes.length === 0 ? (
        <EmptyState message="No quotes created" />
      ) : (
        quotes.map((q) => (
          <Link
            key={q.id}
            href={`/quotes/${q.id}`}
            className="block bg-[#111111] border border-[#262626] hover:border-[#333333] rounded-lg px-4 py-3 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-200">{q.quoteNumber} <span className="text-gray-600">v{q.version}</span></p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatDate(q.createdAt)}
                  {q.validUntil && ` · Valid until ${formatDate(q.validUntil)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-400 font-medium">{formatCurrency(q.total)}</p>
                <p className={cn('text-xs', quoteStatusColors[q.status] ?? 'text-gray-500')}>
                  {q.status}
                </p>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────

function NotesTab({ leadId, notes: initialNotes, canCreate }: {
  leadId: string
  notes: ProductNote[]
  canCreate: boolean
}) {
  const [notes, setNotes] = useState<ProductNote[]>(initialNotes)
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const note = await apiPost<ProductNote>(`/api/leads/${leadId}/notes`, { content })
      setNotes((prev) => [note, ...prev])
      setContent('')
      setShowForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {canCreate && (
        <div>
          {showForm ? (
            <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="Product note…"
                className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={submitting || !content.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 transition-colors"
                >
                  {submitting ? '…' : <><Check size={12} /> Save</>}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 border border-[#262626] rounded-lg hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Plus size={14} /> Add Product Note
            </button>
          )}
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState message="No product notes" />
      ) : (
        notes.map((n) => (
          <div key={n.id} className="bg-[#111111] border border-[#262626] rounded-lg px-4 py-3">
            <p className="text-sm text-gray-300 leading-relaxed">{n.content}</p>
            <p className="text-[10px] text-gray-600 mt-2">
              {n.author ? `${n.author.firstName} ${n.author.lastName}` : ''} · {formatRelativeDate(n.createdAt)}
            </p>
          </div>
        ))
      )}
    </div>
  )
}

// ── Tags Tab ──────────────────────────────────────────────────────────────────

function TagsTab({ leadId, tags: initialTags, canEdit }: {
  leadId: string
  tags: Array<{ tag: TagType }>
  canEdit: boolean
}) {
  const [tags, setTags] = useState<Array<{ tag: TagType }>>(initialTags)
  const [allTags, setAllTags] = useState<TagType[]>([])
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (showPicker && allTags.length === 0) {
      apiGet<TagType[]>('/api/tags').then(setAllTags).catch(() => {})
    }
  }, [showPicker, allTags.length])

  async function addTag(tagId: string) {
    if (tags.some((t) => t.tag.id === tagId)) return
    try {
      const result = await apiPost<{ tag: TagType }>(`/api/leads/${leadId}/tags`, { tagId })
      setTags((prev) => [...prev, result])
    } catch (err) {
      console.error(err)
    }
  }

  async function removeTag(tagId: string) {
    try {
      await apiDelete(`/api/leads/${leadId}/tags?tagId=${tagId}`)
      setTags((prev) => prev.filter((t) => t.tag.id !== tagId))
    } catch (err) {
      console.error(err)
    }
  }

  const currentTagIds = new Set(tags.map((t) => t.tag.id))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag }) => (
          <div
            key={tag.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-[#262626]"
            style={{ backgroundColor: `${tag.color}22`, color: tag.color, borderColor: `${tag.color}44` }}
          >
            <span>{tag.name}</span>
            {canEdit && (
              <button
                onClick={() => removeTag(tag.id)}
                className="hover:opacity-70 transition-opacity ml-0.5"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}

        {canEdit && (
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs border border-dashed border-[#333333] text-gray-600 rounded-full hover:border-[#444444] hover:text-gray-400 transition-colors"
            >
              <Plus size={10} /> Add Tag
            </button>

            {showPicker && allTags.length > 0 && (
              <div className="absolute z-10 mt-1 w-44 bg-[#1a1a1a] border border-[#262626] rounded-lg shadow-xl overflow-hidden">
                {allTags
                  .filter((t) => !currentTagIds.has(t.id))
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { addTag(t.id); setShowPicker(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#262626] text-left transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-sm text-gray-300">{t.name}</span>
                    </button>
                  ))}
                {allTags.filter((t) => !currentTagIds.has(t.id)).length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-600">All tags added</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {tags.length === 0 && !canEdit && <EmptyState message="No tags" />}
    </div>
  )
}

// ── Edit Status Dropdown ──────────────────────────────────────────────────────

function StatusDropdown({ current, onChange }: { current: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5"
      >
        <StatusBadge status={current} />
        <ChevronDown size={12} className="text-gray-600" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-44 bg-[#1a1a1a] border border-[#262626] rounded-lg shadow-xl overflow-hidden">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#262626] transition-colors',
                s === current && 'bg-[#262626]'
              )}
            >
              <StatusBadge status={s} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthStore()

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLead = useCallback(async () => {
    try {
      const data = await apiGet<LeadDetail>(`/api/leads/${id}`)
      setLead(data)
    } catch {
      setError('Lead not found')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return
    setUpdatingStatus(true)
    try {
      const updated = await apiPatch<Lead>(`/api/leads/${id}`, { status })
      setLead((prev) => prev ? { ...prev, status: updated.status } : prev)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await apiDelete(`/api/leads/${id}`)
      router.push('/leads')
    } catch {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const canEdit = !!user && ['REP', 'MANAGER', 'ADMIN'].includes(user.role)
  const canDelete = !!user && ['MANAGER', 'ADMIN'].includes(user.role)
  const canCreateNotes = !!user && ['PRODUCT_MANAGER', 'ADMIN'].includes(user.role)

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-[#1a1a1a] rounded animate-pulse" />
        <div className="h-24 bg-[#1a1a1a] rounded-xl animate-pulse" />
        <div className="h-64 bg-[#1a1a1a] rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <p>{error ?? 'Lead not found'}</p>
        <Link href="/leads" className="mt-2 text-sm text-amber-500 hover:text-amber-400">
          Back to Leads
        </Link>
      </div>
    )
  }

  const activities: ActivityType[] = (lead.activities ?? []) as ActivityType[]
  const productNotes: ProductNote[] = (lead.productNotes ?? []) as ProductNote[]
  const tags: Array<{ tag: TagType }> = (lead.tags ?? []) as Array<{ tag: TagType }>
  const products: LeadProduct[] = (lead.products ?? []) as LeadProduct[]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link href="/leads" className="mt-0.5 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-100 leading-snug">{lead.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <div className={updatingStatus ? 'opacity-50 pointer-events-none' : ''}>
                  <StatusDropdown current={lead.status} onChange={handleStatusChange} />
                </div>
                <ServiceLineBadge serviceLine={lead.serviceLine} size="sm" />
                <PriorityBadge priority={lead.priority} size="sm" />
                {lead.dealValue && (
                  <span className="text-xs text-amber-400 font-medium">{formatCurrency(lead.dealValue)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && (
              <Link
                href={`/leads/${id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-[#262626] rounded-lg hover:border-[#333333] hover:text-gray-300 transition-colors"
              >
                <Edit2 size={13} /> Edit
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-4 md:px-6 border-b border-[#1a1a1a] overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.id === 'activities' ? activities.length
            : tab.id === 'products' ? products.length
            : tab.id === 'quotes' ? (lead.quotes?.length ?? 0)
            : tab.id === 'notes' ? productNotes.length
            : tab.id === 'tags' ? tags.length
            : null

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-gray-600 hover:text-gray-400'
              )}
            >
              <tab.icon size={13} />
              {tab.label}
              {count !== null && count > 0 && (
                <span className="text-[10px] bg-[#262626] rounded-full px-1.5 py-0.5 text-gray-500">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'overview' && <OverviewTab lead={lead} />}
        {activeTab === 'products' && <ProductsTab lead={lead} canEdit={canEdit} />}
        {activeTab === 'activities' && (
          <ActivitiesTab leadId={id} activities={activities} canEdit={canEdit} />
        )}
        {activeTab === 'quotes' && <QuotesTab lead={lead} leadId={id} />}
        {activeTab === 'notes' && (
          <NotesTab leadId={id} notes={productNotes} canCreate={canCreateNotes} />
        )}
        {activeTab === 'tags' && (
          <TagsTab leadId={id} tags={tags} canEdit={canEdit} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-100">Delete Lead</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Are you sure you want to delete <span className="text-gray-200 font-medium">&ldquo;{lead.title}&rdquo;</span>? All activities, quotes, and notes linked to this lead will also be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm text-gray-400 border border-[#262626] rounded-lg hover:border-[#333] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
