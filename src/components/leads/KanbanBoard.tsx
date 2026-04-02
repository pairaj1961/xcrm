'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { apiPatch } from '@/lib/apiClient'
import { formatCurrencyShort, formatDate } from '@/utils/format'
import { StatusBadge, PriorityDot } from './StatusBadge'
import type { Lead, LeadStatus } from '@/types'

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: 'NEW', label: 'New' },
  { status: 'CONTACTED', label: 'Contacted' },
  { status: 'SITE_VISIT_SCHEDULED', label: 'Site Visit' },
  { status: 'QUOTE_SENT', label: 'Quote Sent' },
  { status: 'NEGOTIATION', label: 'Negotiation' },
  { status: 'CLOSED_WON', label: 'Won' },
  { status: 'CLOSED_LOST', label: 'Lost' },
  { status: 'ON_HOLD', label: 'On Hold' },
]

// ── Draggable Lead Card ───────────────────────────────────────────────────────

function LeadCard({ lead, isDragging = false }: { lead: Lead; isDragging?: boolean }) {
  return (
    <div
      className={[
        'bg-[#1a1a1a] border border-[#262626] rounded-lg p-3 select-none',
        isDragging ? 'opacity-50' : 'hover:border-[#333333] transition-colors',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/leads/${lead.id}`}
          className="text-sm font-medium text-gray-200 hover:text-amber-400 transition-colors line-clamp-2 leading-snug"
          onClick={(e) => e.stopPropagation()}
        >
          {lead.title}
        </Link>
        <PriorityDot priority={lead.priority} />
      </div>

      {lead.customer && (
        <p className="text-xs text-gray-500 mb-1 truncate">{lead.customer.companyName}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-amber-400 font-medium">
          {lead.dealValue ? formatCurrencyShort(lead.dealValue) : '—'}
        </span>
        {lead.expectedCloseDate && (
          <span className="text-[10px] text-gray-600">{formatDate(lead.expectedCloseDate)}</span>
        )}
      </div>

      {lead.assignedTo && (
        <p className="text-[10px] text-gray-600 mt-1.5 truncate">
          {lead.assignedTo.firstName} {lead.assignedTo.lastName}
        </p>
      )}
    </div>
  )
}

// ── Sortable Wrapper ──────────────────────────────────────────────────────────

function SortableLeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} isDragging={isDragging} />
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  label,
  leads,
  isOver,
}: {
  status: LeadStatus
  label: string
  leads: Lead[]
  isOver: boolean
}) {
  const totalValue = leads.reduce((sum, l) => sum + (l.dealValue ?? 0), 0)

  return (
    <div
      className={[
        'flex flex-col min-w-[240px] w-[240px] shrink-0',
        'bg-[#111111] border rounded-xl',
        isOver ? 'border-amber-500/50 bg-amber-500/5' : 'border-[#262626]',
        'transition-colors',
      ].join(' ')}
    >
      {/* Column header */}
      <div className="p-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300">{label}</span>
          <span className="text-[10px] bg-[#262626] text-gray-500 rounded-full px-1.5 py-0.5">
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-[10px] text-amber-400">{formatCurrencyShort(totalValue)}</span>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px] max-h-[calc(100vh-220px)]">
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
          {leads.length === 0 && (
            <div className="flex items-center justify-center h-16 text-xs text-gray-700 border border-dashed border-[#262626] rounded-lg">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Main Board ────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  leads: Lead[]
  onLeadUpdated?: (lead: Lead) => void
}

export default function KanbanBoard({ leads: initialLeads, onLeadUpdated }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<LeadStatus | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const getLeadsByStatus = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status),
    [leads]
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: { over: { id: string | number } | null }) {
    if (!event.over) {
      setOverColumn(null)
      return
    }
    // over.id is either a leadId or a column status
    const col = COLUMNS.find((c) => c.status === event.over!.id)
    if (col) {
      setOverColumn(col.status)
      return
    }
    const overLead = leads.find((l) => l.id === event.over!.id)
    if (overLead) {
      setOverColumn(overLead.status)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setOverColumn(null)

    const { active, over } = event
    if (!over) return

    const draggedLead = leads.find((l) => l.id === active.id)
    if (!draggedLead) return

    // Determine target status: over a column header or another card
    let targetStatus: LeadStatus | null = null
    const colMatch = COLUMNS.find((c) => c.status === over.id)
    if (colMatch) {
      targetStatus = colMatch.status
    } else {
      const overLead = leads.find((l) => l.id === over.id)
      if (overLead) targetStatus = overLead.status
    }

    if (!targetStatus || targetStatus === draggedLead.status) return

    // Optimistic update
    const updatedLead = { ...draggedLead, status: targetStatus }
    setLeads((prev) => prev.map((l) => (l.id === draggedLead.id ? updatedLead : l)))

    setUpdating(draggedLead.id)
    try {
      const result = await apiPatch<Lead>(`/api/leads/${draggedLead.id}`, { status: targetStatus })
      setLeads((prev) => prev.map((l) => (l.id === result.id ? result : l)))
      onLeadUpdated?.(result)
    } catch (err) {
      console.error('Failed to update lead status', err)
      // Revert optimistic update
      setLeads((prev) => prev.map((l) => (l.id === draggedLead.id ? draggedLead : l)))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            leads={getLeadsByStatus(col.status)}
            isOver={overColumn === col.status}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2 shadow-xl shadow-black/50 opacity-90">
            <LeadCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>

      {updating && (
        <div className="fixed bottom-4 right-4 bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-xs text-gray-400 shadow-lg">
          Updating status…
        </div>
      )}
    </DndContext>
  )
}
