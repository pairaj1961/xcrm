'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Globe, Package, ExternalLink, Pencil, Plus, Trash2,
  Tag, LayoutGrid, CheckCircle2, XCircle,
} from 'lucide-react'
import { apiGet, apiDelete } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'
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
  rentalMonthlyRate?: number | null
  serviceRatePerHour?: number | null
  unit: string
  minimumOrderQty: number
  isActive: boolean
  categoryId: string
}

interface Category {
  id: string
  name: string
  productType: ProductType
  description?: string | null
  isActive?: boolean
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
  categories: Category[]
  _count: { products: number; categories: number }
}

const TYPE_COLORS: Record<ProductType, string> = {
  EQUIPMENT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CONSUMABLE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACCESSORY: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

function TypeBadge({ type }: { type: ProductType }) {
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider', TYPE_COLORS[type])}>
      {type}
    </span>
  )
}

type Tab = 'categories' | 'products'

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const canManage = user?.role === 'ADMIN' || user?.role === 'PRODUCT_MANAGER'
  const isAdmin = user?.role === 'ADMIN'

  const [isPending, startTransition] = useTransition()
  const [brand, setBrand] = useState<BrandDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('categories')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    startTransition(async () => {
      try {
        const data = await apiGet<BrandDetail>(`/api/products/brands/${id}`)
        setBrand(data)
        setError(null)
      } catch {
        setError('Failed to load brand')
      }
    })
  }, [id])

  useEffect(() => { load() }, [load])

  async function deleteBrand() {
    if (!brand || !confirm(`Delete brand "${brand.name}"?\n\nThis will permanently delete all categories and products under it.`)) return
    setDeletingId('brand')
    try {
      await apiDelete(`/api/products/brands/${id}`)
      router.push('/products')
    } catch {
      alert('Failed to delete brand')
      setDeletingId(null)
    }
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?\n\nAll ${cat.products.length} product(s) in it will also be deleted.`)) return
    setDeletingId(cat.id)
    try {
      await apiDelete(`/api/products/brands/${id}/categories/${cat.id}`)
      setBrand((prev) => prev ? {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== cat.id),
        _count: { ...prev._count, categories: prev._count.categories - 1, products: prev._count.products - cat.products.length },
      } : prev)
    } catch {
      alert('Failed to delete category')
    } finally {
      setDeletingId(null)
    }
  }

  async function deleteProduct(product: ProductRow) {
    if (!confirm(`Delete product "${product.modelName}"?`)) return
    setDeletingId(product.id)
    try {
      await apiDelete(`/api/products/items/${product.id}`)
      setBrand((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === product.categoryId ? { ...c, products: c.products.filter((p) => p.id !== product.id) } : c
          ),
          _count: { ...prev._count, products: prev._count.products - 1 },
        }
      })
    } catch {
      alert('Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  if (isPending || (brand === null && error === null)) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-5 bg-[#1e1e1e] rounded w-24" />
        <div className="h-28 bg-[#111111] border border-[#262626] rounded-xl" />
        <div className="h-10 bg-[#1e1e1e] rounded" />
        <div className="h-48 bg-[#111111] border border-[#262626] rounded-xl" />
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <p className="text-gray-500 text-sm">{error ?? 'Brand not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-amber-400 hover:text-amber-300">Go back</button>
      </div>
    )
  }

  // Flatten products for the Products tab
  const allProducts: ProductRow[] = brand.categories.flatMap((c) =>
    c.products.map((p) => ({ ...p, categoryId: c.id }))
  )
  const filteredProducts = categoryFilter === 'all'
    ? allProducts
    : allProducts.filter((p) => p.categoryId === categoryFilter)

  const categoryMap = Object.fromEntries(brand.categories.map((c) => [c.id, c.name]))

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">

      {/* ── Brand Header ── */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
        <div className="flex items-start gap-3">
          {/* Back */}
          <button
            onClick={() => router.push('/products')}
            className="p-1.5 rounded-lg border border-[#262626] text-gray-500 hover:text-gray-300 hover:border-[#333] transition-colors flex-shrink-0 mt-0.5"
          >
            <ArrowLeft size={14} />
          </button>

          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center flex-shrink-0">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.name} className="w-9 h-9 object-contain" />
            ) : (
              <Package size={20} className="text-gray-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-100" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {brand.name}
              </h1>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                brand.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
              )}>
                {brand.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {brand.countryOfOrigin && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Globe size={11} />{brand.countryOfOrigin}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Tag size={11} />{brand._count.categories} {brand._count.categories === 1 ? 'category' : 'categories'}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <LayoutGrid size={11} />{brand._count.products} products
              </span>
              {brand.websiteUrl && (
                <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                  Website <ExternalLink size={10} />
                </a>
              )}
            </div>
            {brand.description && (
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{brand.description}</p>
            )}
          </div>

          {/* Brand Actions */}
          {canManage && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <Link
                href={`/products/brands/${id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-[#1a1a1a] border border-[#262626] rounded-lg hover:border-[#333] hover:text-white transition-colors"
              >
                <Pencil size={12} /> Edit Brand
              </Link>
              {isAdmin && (
                <button
                  onClick={deleteBrand}
                  disabled={deletingId === 'brand'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={12} /> Delete Brand
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 bg-[#111111] border border-[#262626] rounded-xl p-1">
        {(['categories', 'products'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors',
              tab === t
                ? 'bg-[#1e1e1e] text-gray-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {t === 'categories'
              ? `Categories (${brand._count.categories})`
              : `Products (${brand._count.products})`}
          </button>
        ))}
      </div>

      {/* ── Categories Tab ── */}
      {tab === 'categories' && (
        <div className="space-y-2">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {brand.categories.length === 0 ? 'No categories yet' : `${brand.categories.length} ${brand.categories.length === 1 ? 'category' : 'categories'}`}
            </p>
            {canManage && (
              <Link
                href={`/products/brands/${id}/categories/new`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-400 text-black rounded-lg hover:bg-amber-300 transition-colors"
              >
                <Plus size={13} /> Add Category
              </Link>
            )}
          </div>

          {brand.categories.length === 0 ? (
            <div className="bg-[#111111] border border-[#262626] rounded-xl py-16 flex flex-col items-center gap-3 text-center">
              <Tag size={32} className="text-gray-700" />
              <div>
                <p className="text-sm text-gray-500">No categories yet</p>
                <p className="text-xs text-gray-600 mt-0.5">Add a category to start organising products</p>
              </div>
              {canManage && (
                <Link href={`/products/brands/${id}/categories/new`}
                  className="px-4 py-2 text-xs font-semibold bg-amber-400 text-black rounded-lg hover:bg-amber-300 transition-colors">
                  + Add Category
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
                    <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider">Category</th>
                    <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden md:table-cell">Description</th>
                    <th className="text-center text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider">Products</th>
                    <th className="text-center text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">Status</th>
                    {canManage && <th className="w-24" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {brand.categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-[#141414] transition-colors group">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <TypeBadge type={cat.productType} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500 line-clamp-1">{cat.description ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-xs text-amber-400 font-medium cursor-pointer hover:underline"
                          onClick={() => { setTab('products'); setCategoryFilter(cat.id) }}
                        >
                          {cat.products.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {cat.isActive !== false
                          ? <CheckCircle2 size={14} className="text-green-500 mx-auto" />
                          : <XCircle size={14} className="text-gray-600 mx-auto" />}
                      </td>
                      {canManage && (
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/products/brands/${id}/categories/${cat.id}/edit`}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-amber-400 hover:bg-amber-400/5 rounded transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </Link>
                            {isAdmin && (
                              <button
                                onClick={() => deleteCategory(cat)}
                                disabled={deletingId === cat.id}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-400 hover:bg-red-400/5 rounded transition-colors disabled:opacity-40"
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Products Tab ── */}
      {tab === 'products' && (
        <div className="space-y-2">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#111111] border border-[#262626] rounded-lg text-gray-300 outline-none"
            >
              <option value="all">All Categories</option>
              {brand.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 flex-1">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </p>
            {canManage && (
              <Link
                href={`/products/brands/${id}/products/new`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-400 text-black rounded-lg hover:bg-amber-300 transition-colors"
              >
                <Plus size={13} /> Add Product
              </Link>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-[#111111] border border-[#262626] rounded-xl py-16 flex flex-col items-center gap-3 text-center">
              <Package size={32} className="text-gray-700" />
              <div>
                <p className="text-sm text-gray-500">No products yet</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {brand.categories.length === 0
                    ? 'Add a category first, then add products'
                    : 'Add your first product to this brand'}
                </p>
              </div>
              {canManage && brand.categories.length > 0 && (
                <Link href={`/products/brands/${id}/products/new`}
                  className="px-4 py-2 text-xs font-semibold bg-amber-400 text-black rounded-lg hover:bg-amber-300 transition-colors">
                  + Add Product
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
                      <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider">Model</th>
                      <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                      <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden md:table-cell">Category</th>
                      <th className="text-left text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden lg:table-cell">Type</th>
                      <th className="text-right text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider">Sale Price</th>
                      <th className="text-right text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden lg:table-cell">Rental/Day</th>
                      <th className="text-center text-[10px] text-gray-600 font-medium px-4 py-2.5 uppercase tracking-wider hidden sm:table-cell">Status</th>
                      {canManage && <th className="w-28" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#141414] transition-colors group">
                        <td className="px-4 py-3">
                          <p className="text-gray-200 font-medium">{product.modelName}</p>
                          {product.modelNumber && <p className="text-[11px] text-gray-600">{product.modelNumber}</p>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500 font-mono">{product.sku ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-500">{categoryMap[product.categoryId] ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <TypeBadge type={product.productType} />
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">
                          {product.salePrice != null ? formatCurrency(product.salePrice) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400 hidden lg:table-cell">
                          {product.rentalDailyRate != null ? formatCurrency(product.rentalDailyRate) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          {product.isActive
                            ? <CheckCircle2 size={14} className="text-green-500 mx-auto" />
                            : <XCircle size={14} className="text-gray-600 mx-auto" />}
                        </td>
                        {canManage && (
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/products/brands/${id}/products/${product.id}/edit`}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-amber-400 hover:bg-amber-400/5 rounded transition-colors"
                              >
                                <Pencil size={11} /> Edit
                              </Link>
                              {isAdmin && (
                                <button
                                  onClick={() => deleteProduct(product)}
                                  disabled={deletingId === product.id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-400 hover:bg-red-400/5 rounded transition-colors disabled:opacity-40"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
