'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Globe, Tag, Plus, Pencil, Trash2, LayoutGrid } from 'lucide-react'
import { apiGet, apiDelete } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'
import type { Brand } from '@/types'

function BrandCard({
  brand, canManage, isAdmin, onDeleted,
}: {
  brand: Brand
  canManage: boolean
  isAdmin: boolean
  onDeleted: (id: string) => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete brand "${brand.name}"?\n\nThis will also delete all categories and products under it.`)) return
    setDeleting(true)
    try {
      await apiDelete(`/api/products/brands/${brand.id}`)
      onDeleted(brand.id)
    } catch {
      alert('Failed to delete brand')
      setDeleting(false)
    }
  }

  return (
    <div className={cn(
      'bg-[#111111] border border-[#262626] rounded-xl p-4 flex flex-col gap-3 group transition-all',
      'hover:border-[#333] hover:bg-[#141414]'
    )}>
      {/* Top row: logo + status + count */}
      <div className="flex items-start justify-between gap-2">
        <div
          onClick={() => router.push(`/products/brands/${brand.id}`)}
          className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#262626] flex items-center justify-center flex-shrink-0 cursor-pointer"
        >
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="w-7 h-7 object-contain" />
          ) : (
            <Package size={18} className="text-gray-600 group-hover:text-amber-400/60 transition-colors" />
          )}
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0',
          brand.isActive !== false
            ? 'bg-green-500/10 text-green-500 border-green-500/20'
            : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
        )}>
          {brand.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Name + origin — clickable */}
      <div
        onClick={() => router.push(`/products/brands/${brand.id}`)}
        className="cursor-pointer flex-1"
      >
        <h3 className="text-sm font-semibold text-gray-200 group-hover:text-amber-400 transition-colors">
          {brand.name}
        </h3>
        {brand.countryOfOrigin && (
          <div className="flex items-center gap-1 mt-0.5">
            <Globe size={10} className="text-gray-600" />
            <span className="text-[11px] text-gray-500">{brand.countryOfOrigin}</span>
          </div>
        )}
        {brand.description && (
          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{brand.description}</p>
        )}
      </div>

      {/* Stats */}
      <div
        onClick={() => router.push(`/products/brands/${brand.id}`)}
        className="flex items-center gap-3 cursor-pointer"
      >
        <span className="flex items-center gap-1 text-[11px] text-gray-600">
          <Tag size={10} />
          {brand._count?.categories ?? 0} {(brand._count?.categories ?? 0) === 1 ? 'category' : 'categories'}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gray-600">
          <LayoutGrid size={10} />
          {brand._count?.products ?? 0} products
        </span>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#1a1a1a]">
          <Link
            href={`/products/brands/${brand.id}`}
            className="flex-1 flex items-center justify-center py-1.5 text-xs text-gray-500 hover:text-gray-200 hover:bg-[#1e1e1e] rounded-lg transition-colors"
          >
            View
          </Link>
          <Link
            href={`/products/brands/${brand.id}/edit`}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-amber-400 hover:bg-amber-400/5 rounded-lg transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil size={11} /> Edit
          </Link>
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 size={11} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [isPending, startTransition] = useTransition()
  const [brands, setBrands] = useState<Brand[]>([])
  const [error, setError] = useState<string | null>(null)

  const canManage = user?.role === 'ADMIN' || user?.role === 'PRODUCT_MANAGER'
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await apiGet<Brand[]>('/api/products')
        setBrands(data)
        setError(null)
      } catch {
        setError('Failed to load brands')
      }
    })
  }, [])

  function handleDeleted(id: string) {
    setBrands((prev) => prev.filter((b) => b.id !== id))
  }

  const loading = isPending && brands.length === 0

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-100" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Product Catalog
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {brands.length > 0 ? `${brands.length} brand${brands.length !== 1 ? 's' : ''}` : 'Manage brands, categories and products'}
          </p>
        </div>
        {canManage && (
          <Link
            href="/products/brands/new"
            className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
          >
            <Plus size={14} /> New Brand
          </Link>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#111111] border border-[#262626] rounded-xl p-4 h-44 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[#111111] border border-[#262626] rounded-xl">
          <Package size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-400 text-sm font-medium">No brands yet</p>
          <p className="text-gray-600 text-xs mt-1 mb-4">Add your first brand to start building the product catalog</p>
          {canManage && (
            <Link href="/products/brands/new"
              className="px-4 py-2 text-sm font-semibold bg-amber-400 text-black rounded-lg hover:bg-amber-300 transition-colors">
              + Add Brand
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {brands.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              canManage={canManage}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
