'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Globe, Tag } from 'lucide-react'
import { apiGet } from '@/lib/apiClient'
import type { Brand } from '@/types'

function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/products/brands/${brand.id}`}
      className="bg-[#111111] border border-[#262626] rounded-xl p-4 hover:border-amber-400/30 hover:bg-[#141414] transition-all group flex flex-col gap-3"
    >
      {/* Brand logo / placeholder */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#262626] flex items-center justify-center flex-shrink-0">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="w-7 h-7 object-contain" />
          ) : (
            <Package size={18} className="text-gray-600 group-hover:text-amber-400/60 transition-colors" />
          )}
        </div>
        <span className="text-[10px] text-gray-600 bg-[#1a1a1a] border border-[#262626] rounded px-1.5 py-0.5 flex-shrink-0">
          {brand._count?.products ?? 0} products
        </span>
      </div>

      {/* Name + origin */}
      <div>
        <h3 className="text-sm font-semibold text-gray-200 group-hover:text-amber-400 transition-colors">
          {brand.name}
        </h3>
        {brand.countryOfOrigin && (
          <div className="flex items-center gap-1 mt-0.5">
            <Globe size={10} className="text-gray-600" />
            <span className="text-[11px] text-gray-500">{brand.countryOfOrigin}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {brand.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{brand.description}</p>
      )}

      {/* Category count */}
      <div className="flex items-center gap-1 mt-auto">
        <Tag size={10} className="text-gray-600" />
        <span className="text-[11px] text-gray-600">
          {brand._count?.categories ?? 0} {brand._count?.categories === 1 ? 'category' : 'categories'}
        </span>
      </div>
    </Link>
  )
}

export default function ProductsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<Brand[]>('/api/products')
      .then(setBrands)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1
          className="text-xl font-bold text-gray-100"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          Product Catalog
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Browse brands and product categories</p>
      </div>

      {/* Brand grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-[#111111] border border-[#262626] rounded-xl p-4 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">No brands found</p>
          <p className="text-gray-600 text-xs mt-1">
            Brands will appear here once assigned to your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      )}
    </div>
  )
}
