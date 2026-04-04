'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPut, apiGet as apiBrandsGet } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/cn'
import { Loader2, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

const settingsSchema = z.object({
  companyName: z.string().min(1),
  taxRate: z.number().min(0).max(100),
  currency: z.string().min(1),
})
type SettingsData = z.infer<typeof settingsSchema>

type Tab = 'general' | 'users' | 'brands'

interface TeamUser {
  id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean
  assignedBrands: Array<{ brand: { id: string; name: string } }>
}
interface Brand { id: string; name: string }

export default function SettingsPage() {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)
  const [users, setUsers] = useState<TeamUser[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandAssignments, setBrandAssignments] = useState<Record<string, string[]>>({})
  const [savingBrands, setSavingBrands] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { companyName: 'xCRM', taxRate: 7, currency: 'THB' },
  })

  useEffect(() => {
    if (isLoading) return
    if (user?.role !== 'ADMIN') { router.replace('/dashboard'); return }
    apiGet<SettingsData & { id: string }>('/api/settings').then((s) => reset(s)).catch(() => {})
  }, [isLoading, user, router, reset])

  useEffect(() => {
    if (tab === 'users') {
      apiGet<TeamUser[]>('/api/users').then(setUsers).catch(() => {})
    }
    if (tab === 'brands') {
      Promise.all([
        apiGet<Brand[]>('/api/products'),
        apiGet<TeamUser[]>('/api/users?role=PRODUCT_MANAGER'),
      ]).then(([b, u]) => {
        setBrands(b as Brand[])
        setUsers(u)
        const assignments: Record<string, string[]> = {}
        u.forEach((pm) => { assignments[pm.id] = pm.assignedBrands.map((ab) => ab.brand.id) })
        setBrandAssignments(assignments)
      }).catch(() => {})
    }
  }, [tab])

  async function onSaveSettings(data: SettingsData) {
    await apiPut('/api/settings', data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveBrandAssignments(userId: string) {
    setSavingBrands(userId)
    try {
      await apiPut(`/api/users/${userId}/brands`, { brandIds: brandAssignments[userId] ?? [] })
    } finally { setSavingBrands(null) }
  }

  function toggleBrand(userId: string, brandId: string) {
    setBrandAssignments((prev) => {
      const cur = prev[userId] ?? []
      return { ...prev, [userId]: cur.includes(brandId) ? cur.filter((b) => b !== brandId) : [...cur, brandId] }
    })
  }

  const pms = users.filter((u) => u.role === 'PRODUCT_MANAGER')

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-[#111111] border border-[#262626] rounded-lg p-1 w-fit">
        {(['general', 'users', 'brands'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors', tab === t ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-gray-200')}
          >
            {t === 'brands' ? 'Brand Assignments' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <form onSubmit={handleSubmit(onSaveSettings)} className="bg-[#111111] border border-[#262626] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300">General Settings</h2>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Company Name</label>
            <input {...register('companyName')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
            {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Tax Rate (%)</label>
              <input type="number" step="0.1" {...register('taxRate', { valueAsNumber: true })} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Currency</label>
              <input {...register('currency')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : null}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </form>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-[#262626]">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#1a1a1a]">
                  <td className="px-4 py-3 text-gray-300">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.role.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs', u.isActive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Brand Assignments */}
      {tab === 'brands' && (
        <div className="space-y-4">
          {pms.length === 0 && <p className="text-gray-600 text-sm">No Product Managers found.</p>}
          {pms.map((pm) => (
            <div key={pm.id} className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">{pm.firstName} {pm.lastName}</p>
                  <p className="text-xs text-gray-500">{pm.email}</p>
                </div>
                <button
                  onClick={() => saveBrandAssignments(pm.id)}
                  disabled={savingBrands === pm.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {savingBrands === pm.id && <Loader2 size={12} className="animate-spin" />}
                  Save
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {brands.map((brand: Brand) => {
                  const assigned = (brandAssignments[pm.id] ?? []).includes(brand.id)
                  return (
                    <button
                      key={brand.id}
                      onClick={() => toggleBrand(pm.id, brand.id)}
                      className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors', assigned ? 'bg-amber-400/15 border-amber-400/30 text-amber-400' : 'bg-[#1a1a1a] border-[#262626] text-gray-500 hover:text-gray-300')}
                    >
                      {brand.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
