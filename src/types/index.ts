// Enums
export type Role = 'REP' | 'MANAGER' | 'PRODUCT_MANAGER' | 'ADMIN'
export type ProductType = 'EQUIPMENT' | 'CONSUMABLE' | 'ACCESSORY'
export type CustomerIndustry = 'CONSTRUCTION' | 'INDUSTRIAL_FACTORY' | 'OTHER'
export type CustomerTier = 'PROSPECT' | 'ACTIVE' | 'VIP' | 'INACTIVE'
export type SiteType = 'CONSTRUCTION_SITE' | 'FACTORY' | 'WAREHOUSE' | 'OFFICE' | 'OTHER'
export type ServiceLine = 'SALE' | 'RENTAL' | 'SERVICE'
export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'SITE_VISIT_SCHEDULED'
  | 'QUOTE_SENT'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'
  | 'ON_HOLD'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'SITE_VISIT'
  | 'DEMO'
  | 'QUOTE_SENT'
  | 'MEETING'
  | 'NOTE'
  | 'TASK'
  | 'REPAIR_VISIT'
  | 'MAINTENANCE_CHECK'
  | 'CALIBRATION'
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
export type TargetType = 'REVENUE' | 'LEADS_CLOSED' | 'DEALS_COUNT'

// User
export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  createdAt: string
}

// Auth
export interface AuthState {
  user: UserProfile | null
  isLoading: boolean
}

// Brand
export interface Brand {
  id: string
  name: string
  logoUrl?: string | null
  countryOfOrigin?: string | null
  description?: string | null
  websiteUrl?: string | null
  isActive: boolean
  createdAt: string
  _count?: { products: number; categories: number }
}

// Product Category
export interface ProductCategory {
  id: string
  brandId: string
  name: string
  productType: ProductType
  description?: string | null
  isActive: boolean
  brand?: { name: string }
}

// Product
export interface Product {
  id: string
  categoryId: string
  brandId: string
  sku?: string | null
  modelName: string
  modelNumber?: string | null
  description?: string | null
  productType: ProductType
  salePrice?: number | null
  rentalDailyRate?: number | null
  rentalWeeklyRate?: number | null
  rentalMonthlyRate?: number | null
  serviceRatePerHour?: number | null
  unit: string
  minimumOrderQty: number
  isActive: boolean
  category?: { name: string }
  brand?: { name: string }
}

// Customer
export interface Customer {
  id: string
  companyName: string
  industry: CustomerIndustry
  tier: CustomerTier
  billingAddress?: string | null
  website?: string | null
  registrationNumber?: string | null
  taxId?: string | null
  notes?: string | null
  assignedRepId?: string | null
  createdAt: string
  _count?: { leads: number; sites: number }
}

// Customer Site
export interface CustomerSite {
  id: string
  customerId: string
  siteName: string
  siteType: SiteType
  address?: string | null
  province?: string | null
  country: string
  projectStartDate?: string | null
  projectEndDate?: string | null
  isActive: boolean
  contacts?: SiteContact[]
}

// Site Contact
export interface SiteContact {
  id: string
  siteId: string
  name: string
  title?: string | null
  phone?: string | null
  email?: string | null
  isPrimary: boolean
}

// Lead
export interface Lead {
  id: string
  title: string
  customerId: string
  siteId?: string | null
  serviceLine: ServiceLine
  status: LeadStatus
  priority: Priority
  dealValue?: number | null
  rentalDurationDays?: number | null
  serviceContractMonths?: number | null
  expectedCloseDate?: string | null
  lostReason?: string | null
  lostToCompetitor?: string | null
  assignedToId: string
  createdById: string
  notes?: string | null
  decisionMakerName?: string | null
  decisionMakerTitle?: string | null
  createdAt: string
  updatedAt: string
  customer?: { companyName: string; tier: CustomerTier }
  site?: { siteName: string; province?: string | null } | null
  assignedTo?: { firstName: string; lastName: string; email: string }
  createdBy?: { firstName: string; lastName: string; email: string }
  _count?: { activities: number; quotes: number }
}

// Lead with full detail
export interface LeadDetail extends Lead {
  products?: LeadProduct[]
  activities?: Activity[]
  quotes?: QuoteSummary[]
  productNotes?: ProductNote[]
  tags?: Array<{ tag: Tag }>
}

// Lead Product
export interface LeadProduct {
  id: string
  leadId: string
  productId: string
  quantity: number
  unitPrice: number
  rentalDays?: number | null
  notes?: string | null
  product?: Product
}

// Product Note
export interface ProductNote {
  id: string
  leadId: string
  authorId: string
  content: string
  createdAt: string
  author?: { firstName: string; lastName: string }
}

// Activity
export interface Activity {
  id: string
  leadId: string
  userId: string
  type: ActivityType
  subject: string
  description?: string | null
  location?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  outcome?: string | null
  followUpDate?: string | null
  createdAt: string
  user?: { firstName: string; lastName: string }
}

// Quote
export interface QuoteSummary {
  id: string
  leadId: string
  quoteNumber: string
  version: number
  status: QuoteStatus
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  validUntil?: string | null
  createdAt: string
}

export interface QuoteLineItem {
  id: string
  quoteId: string
  productId?: string | null
  description: string
  qty: number
  unitPrice: number
  discount: number
  subtotal: number
  product?: Pick<Product, 'id' | 'modelName' | 'sku'>
}

export interface QuoteDetail extends QuoteSummary {
  notes?: string | null
  lineItems: QuoteLineItem[]
  lead?: { id: string; title: string; customer?: { companyName: string } }
}

// Target
export interface Target {
  id: string
  userId: string
  period: string
  targetType: TargetType
  serviceLineFocus?: string | null
  targetValue: number
  user?: { firstName: string; lastName: string }
}

// Tag
export interface Tag {
  id: string
  name: string
  color: string
}

// Audit Log
export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValue?: string | null
  newValue?: string | null
  ipAddress?: string | null
  createdAt: string
  user?: { firstName: string; lastName: string; email: string }
}

// Settings
export interface Settings {
  id: string
  companyName: string
  taxRate: number
  currency: string
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// API response
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// Dashboard
export interface KPIData {
  label: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'flat'
}
