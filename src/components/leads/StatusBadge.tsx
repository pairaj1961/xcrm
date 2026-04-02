'use client'

import { cn } from '@/lib/cn'
import type { LeadStatus, ServiceLine, Priority } from '@/types'

// ── Lead Status ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  CONTACTED: { label: 'Contacted', className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  SITE_VISIT_SCHEDULED: { label: 'Site Visit', className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  QUOTE_SENT: { label: 'Quote Sent', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  NEGOTIATION: { label: 'Negotiation', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  CLOSED_WON: { label: 'Won', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  CLOSED_LOST: { label: 'Lost', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  ON_HOLD: { label: 'On Hold', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
}

// ── Service Line ─────────────────────────────────────────────────────────────

const SERVICE_LINE_CONFIG: Record<ServiceLine, { label: string; className: string }> = {
  SALE: { label: 'Sale', className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  RENTAL: { label: 'Rental', className: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  SERVICE: { label: 'Service', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
}

// ── Priority ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  MEDIUM: { label: 'Medium', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  HIGH: { label: 'High', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  URGENT: { label: 'Urgent', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

// ── Components ────────────────────────────────────────────────────────────────

interface BadgeProps {
  className?: string
  size?: 'sm' | 'md'
}

const baseClass = 'inline-flex items-center rounded-md border font-medium'
const sizeClass = { sm: 'px-1.5 py-0.5 text-[10px]', md: 'px-2 py-0.5 text-xs' }

export function StatusBadge({ status, size = 'md', className }: BadgeProps & { status: LeadStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={cn(baseClass, sizeClass[size], config.className, className)}>
      {config.label}
    </span>
  )
}

export function ServiceLineBadge({ serviceLine, size = 'md', className }: BadgeProps & { serviceLine: ServiceLine }) {
  const config = SERVICE_LINE_CONFIG[serviceLine]
  return (
    <span className={cn(baseClass, sizeClass[size], config.className, className)}>
      {config.label}
    </span>
  )
}

export function PriorityBadge({ priority, size = 'md', className }: BadgeProps & { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <span className={cn(baseClass, sizeClass[size], config.className, className)}>
      {config.label}
    </span>
  )
}

// Dot indicator for priority
export function PriorityDot({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = {
    LOW: 'bg-gray-500',
    MEDIUM: 'bg-yellow-400',
    HIGH: 'bg-orange-400',
    URGENT: 'bg-red-500',
  }
  return <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', colors[priority])} />
}

export { STATUS_CONFIG, SERVICE_LINE_CONFIG, PRIORITY_CONFIG }
