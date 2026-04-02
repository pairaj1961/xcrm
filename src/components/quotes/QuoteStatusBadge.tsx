import { cn } from '@/lib/cn'

const config: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: 'Draft',    className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  SENT:     { label: 'Sent',     className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-500/15 text-green-400 border-green-500/20' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
  EXPIRED:  { label: 'Expired',  className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
}

export default function QuoteStatusBadge({ status }: { status: string }) {
  const c = config[status] ?? { label: status, className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', c.className)}>
      {c.label}
    </span>
  )
}
