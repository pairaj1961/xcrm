'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Package, X, ChevronDown } from 'lucide-react'
import { apiGet } from '@/lib/apiClient'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/utils/format'
import type { ProductType } from '@/types'

interface ProductSearchResult {
  id: string
  sku?: string | null
  modelName: string
  modelNumber?: string | null
  productType: ProductType
  salePrice?: number | null
  rentalDailyRate?: number | null
  unit: string
  brand: { id: string; name: string }
  category: { id: string; name: string }
}

interface ProductSelectorProps {
  /** Called when user selects a product */
  onSelect: (product: ProductSearchResult) => void
  /** Currently selected product (for controlled usage) */
  value?: ProductSearchResult | null
  /** Called when user clears the selection */
  onClear?: () => void
  /** Optional pre-filter by brand */
  brandId?: string
  /** Optional pre-filter by product type */
  productType?: ProductType
  /** Placeholder text */
  placeholder?: string
  /** Extra class names for the outer wrapper */
  className?: string
  /** Disable the selector */
  disabled?: boolean
}

const PRODUCT_TYPE_COLORS: Record<ProductType, string> = {
  EQUIPMENT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CONSUMABLE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACCESSORY: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

function TypeBadge({ type }: { type: ProductType }) {
  return (
    <span
      className={cn(
        'text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider flex-shrink-0',
        PRODUCT_TYPE_COLORS[type]
      )}
    >
      {type}
    </span>
  )
}

export function ProductSelector({
  onSelect,
  value,
  onClear,
  brandId,
  productType,
  placeholder = 'Search products…',
  className,
  disabled = false,
}: ProductSelectorProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // Fetch results when debouncedQuery or filters change
  const fetchResults = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (brandId) params.set('brandId', brandId)
      if (productType) params.set('type', productType)

      const data = await apiGet<ProductSearchResult[]>(`/api/products/search?${params.toString()}`)
      setResults(data)
    } catch (err) {
      console.error('[ProductSelector] fetch error', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [open, debouncedQuery, brandId, productType])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    if (disabled) return
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(product: ProductSearchResult) {
    onSelect(product)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onClear?.()
    setQuery('')
  }

  // Trigger display mode: show selected value, or the input/trigger button
  if (value && !open) {
    return (
      <div
        ref={wrapperRef}
        className={cn(
          'relative flex items-center gap-2 bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 cursor-pointer hover:border-[#333] transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={!disabled ? handleOpen : undefined}
      >
        <Package size={13} className="text-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 truncate">{value.modelName}</p>
          <p className="text-[11px] text-gray-500 truncate">{value.brand.name} · {value.category.name}</p>
        </div>
        <TypeBadge type={value.productType} />
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Trigger / search input */}
      {open ? (
        <div className="flex items-center gap-2 bg-[#111111] border border-amber-400/40 rounded-lg px-3 py-2">
          <Search size={13} className="text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false)
                setQuery('')
              }
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={cn(
            'w-full flex items-center gap-2 bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-left hover:border-[#333] transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Package size={13} className="text-gray-600 flex-shrink-0" />
          <span className="flex-1 text-sm text-gray-600">{placeholder}</span>
          <ChevronDown size={13} className="text-gray-600 flex-shrink-0" />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#111111] border border-[#262626] rounded-lg shadow-xl overflow-hidden">
          {loading ? (
            <div className="px-3 py-8 flex items-center justify-center gap-2 text-gray-600">
              <div className="w-4 h-4 border border-gray-600 border-t-amber-400 rounded-full animate-spin" />
              <span className="text-xs">Searching…</span>
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Package size={20} className="text-gray-700 mx-auto mb-1.5" />
              <p className="text-xs text-gray-600">
                {debouncedQuery ? `No products matching "${debouncedQuery}"` : 'Start typing to search'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#1a1a1a] max-h-72 overflow-y-auto">
              {results.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(product)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#161616] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded bg-[#1a1a1a] border border-[#262626] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Package size={12} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-gray-200 font-medium">{product.modelName}</p>
                        <TypeBadge type={product.productType} />
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {product.brand.name} · {product.category.name}
                        {product.sku ? ` · ${product.sku}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {product.salePrice != null && (
                        <p className="text-xs text-amber-400 font-medium">
                          {formatCurrency(product.salePrice)}
                        </p>
                      )}
                      {product.rentalDailyRate != null && (
                        <p className="text-[10px] text-gray-500">
                          {formatCurrency(product.rentalDailyRate)}/day
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-[#1a1a1a] bg-[#0d0d0d] flex items-center justify-between">
            <p className="text-[10px] text-gray-700">
              {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}
            </p>
            <p className="text-[10px] text-gray-700">Esc to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductSelector
