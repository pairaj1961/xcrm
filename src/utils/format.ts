// Currency formatter
export function formatCurrency(value: number | null | undefined, currency = 'THB'): string {
  if (value == null) return '฿0'
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Short currency (e.g. ฿1.2M)
export function formatCurrencyShort(value: number | null | undefined): string {
  if (value == null) return '฿0'
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`
  return `฿${value.toLocaleString('th-TH')}`
}

// Date formatter
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Relative date (e.g. "3 days ago")
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// Percentage
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '0%'
  return `${value.toFixed(1)}%`
}

// Name
export function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

// Initials
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

// Status label
export function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Period label (YYYY-MM → Apr 2025)
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  if (!year || !month) return period
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Current period string
export function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Days until date
export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const diffMs = new Date(date).getTime() - new Date().getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
