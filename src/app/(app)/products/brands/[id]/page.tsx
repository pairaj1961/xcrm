'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Globe, Package, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { apiGet } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/utils/format'
import type { ProductType } from '@/types'

interface ProductRow {
  id: string
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
}

interface CategoryWithProducts {
  id: string
  name: string
  productType: ProductType
  description?: string | null
  products: ProductRow[]
}

interface BrandDetail {
  id: string
  name: string
  logoUrl?: string | null
  countryOfOrigin?: string | null
  description?: string | null
  websiteUrl?: string | null
  isActive: boolean
  categories: CategoryWithProducts[]
  _count: { products: number; categories: number }
}

const PRODUCT_TYPE_COLORS: Record<ProductType, string> = {
  EQUIPMENT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CONSUMABLE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACCESSORY: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

function ProductTypeBadge({ type }: { type: ProductType }) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider',
        PRODUCT_TYPE_COLORS[type]
      )}
    >
      {type}
    </span>
  )
}

function CategorySection({ category }: { category: CategoryWithProducts }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#141414] transition-colors border-b border-[#1a1a1a]"
      >
        <div className="flex items-center gap-2.5">
          <ProductTypeBadge type={category.productType} />
          <span className="text-sm font-semibold text-gray-200">{category.name}</span>
          <span className="text-xs text-gray-600">{category.products.length} item{category.products.length !== 1 ? 's' : ''}</span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-gray-600" />
        ) : (
          <ChevronDown size={14} className="text-gray-600" />
        )}
      </button>

      {expanded && (
        <>
          {category.description && (
            <p className="px-4 py-2 text-xs text-gray-500 border-b border-[#1a1a1a] bg-[#0d0d0d]">
              {category.description}
            </p>
          )}
          {category.products.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-gray-600">No active products in this category</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
                    <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2 uppercase tracking-wider">Model</th>
                    <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                    <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden md:table-cell">Type</th>
                    <th className="text-right text-[10px] text-gray-600 font-medium px-4 py-2 uppercase tracking-wider">Sale Price</th>
                    <th className="text-right text-[10px] text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden lg:table-cell">Rental/Day</th>
                    <th className="text-right text-[10px] text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden xl:table-cell">Service/hr</th>
                    <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2 uppercase tracking-wider hidden sm:table-cell">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {category.products.map((product) => (
                    <tr key={product.id} className="hover:bg-[#141414] transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="text-gray-200 font-medium">{product.modelName}</p>
                        {product.modelNumber && (
                          <p className="text-[11px] text-gray-600">{product.modelNumber}</p>
                        )}
                        {product.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 hidden md:block mt-0.5">
                            {product.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono hidden sm:table-cell">
                        {product.sku ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <ProductTypeBadge type={product.productType} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm text-gray-300">
                        {product.salePrice != null ? formatCurrency(product.salePrice) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400 hidden lg:table-cell">
                        {product.rentalDailyRate != null ? formatCurrency(product.rentalDailyRate) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400 hidden xl:table-cell">
                        {product.serviceRatePerHour != null ? formatCurrency(product.serviceRatePerHour) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 hidden sm:table-cell">
                        {product.unit}
                        {product.minimumOrderQty > 1 && (
                          <span className="text-gray-600"> (min {product.minimumOrderQty})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [brand, setBrand] = useState<BrandDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiGet<BrandDetail>(`/api/products/brands/${id}`)
      .then(setBrand)
      .catch((err) => {
        console.error(err)
        setError('Failed to load brand')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#1e1e1e] rounded w-32" />
        <div className="h-24 bg-[#111111] border border-[#262626] rounded-xl" />
        <div className="h-64 bg-[#111111] border border-[#262626] rounded-xl" />
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 text-sm">{error ?? 'Brand not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-amber-400 hover:text-amber-300">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Back + Brand header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg border border-[#262626] text-gray-500 hover:text-gray-300 hover:border-[#333] transition-colors mt-0.5"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="w-10 h-10 object-contain rounded-lg bg-[#1a1a1a] p-1 border border-[#262626]"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#262626] flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-gray-600" />
              </div>
            )}
            <div>
              <h1
                className="text-xl font-bold text-gray-100"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {brand.name}
              </h1>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {brand.countryOfOrigin && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Globe size={10} />
                    {brand.countryOfOrigin}
                  </span>
                )}
                <span className="text-xs text-gray-600">
                  {brand._count.products} products · {brand._count.categories} categories
                </span>
                {brand.websiteUrl && (
                  <a
                    href={brand.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Website
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
          {brand.description && (
            <p className="text-sm text-gray-400 mt-2 ml-[52px]">{brand.description}</p>
          )}
        </div>
      </div>

      {/* Categories with products */}
      {brand.categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">No active categories found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brand.categories.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  )
}
