'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/utils/format'
import { cn } from '@/lib/cn'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil, X, Loader2, Search, UserMinus, Package, Users, KeyRound, Copy, Check } from 'lucide-react'
import type { Brand } from '@/types'

interface TeamUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  phone?: string | null
  isActive: boolean
  manager?: { id: string; firstName: string; lastName: string } | null
  subordinates: { id: string; firstName: string; lastName: string; isActive: boolean }[]
  assignedBrands: Array<{ brand: { id: string; name: string } }>
  _count: { assignedLeads: number }
}

const ROLE_COLORS: Record<string, string> = {
  REP: 'bg-blue-500/15 text-blue-400',
  MANAGER: 'bg-purple-500/15 text-purple-400',
  PRODUCT_MANAGER: 'bg-amber-500/15 text-amber-400',
  ADMIN: 'bg-red-500/15 text-red-400',
}

const ROLE_LABELS: Record<string, string> = {
  REP: 'Rep',
  MANAGER: 'Manager',
  PRODUCT_MANAGER: 'Product Manager',
  ADMIN: 'Admin',
}

const ROLE_TABS = ['All', 'REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  role: z.enum(['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']),
})
type InviteData = z.infer<typeof inviteSchema>

const editSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  role: z.enum(['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']),
  isActive: z.boolean(),
  managerId: z.string().optional(),
})
type EditData = z.infer<typeof editSchema>

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#111111] border border-[#262626] rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-400 block mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function BrandCheckboxes({ brands, selected, onChange }: {
  brands: Brand[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }
  return (
    <div>
      <label className="text-xs font-medium text-gray-400 block mb-1.5">
        Brand Access <span className="text-gray-600 font-normal">(brands this PM manages)</span>
      </label>
      {brands.length === 0 ? (
        <p className="text-xs text-gray-600 py-2">No brands available</p>
      ) : (
        <div className="border border-[#262626] rounded-lg divide-y divide-[#1a1a1a] max-h-48 overflow-y-auto">
          {brands.map((b) => (
            <label key={b.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#1a1a1a] transition-colors">
              <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)}
                className="w-4 h-4 accent-amber-400" />
              <div className="flex items-center gap-2 min-w-0">
                <Package size={12} className="text-gray-600 flex-shrink-0" />
                <span className="text-sm text-gray-300 truncate">{b.name}</span>
              </div>
              {selected.includes(b.id) && (
                <span className="ml-auto text-[10px] text-amber-400 font-medium flex-shrink-0">Assigned</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const inputClass = 'w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50 transition-colors'

function TempPasswordBox({ name, email, password, onClose }: { name: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#111111] border border-[#262626] rounded-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
            <KeyRound size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">Temporary Password</p>
            <p className="text-xs text-gray-500">{name} · {email}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">Share this password with the user. They should change it after first login.</p>
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2.5">
          <code className="flex-1 text-sm text-amber-300 font-mono tracking-wide">{password}</code>
          <button onClick={copy} className="text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
        <button onClick={onClose}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-lg text-sm transition-colors">
          Done
        </button>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { user } = useAuthStore()
  const [members, setMembers] = useState<TeamUser[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<TeamUser | null>(null)
  const [editBrandIds, setEditBrandIds] = useState<string[]>([])
  const [deactivateTarget, setDeactivateTarget] = useState<TeamUser | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [tempPw, setTempPw] = useState<{ name: string; email: string; password: string } | null>(null)
  const [resettingPw, setResettingPw] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const managers = members.filter((m) => m.role === 'MANAGER' && m.isActive)

  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== 'All') params.set('role', roleFilter)
      if (search) params.set('search', search)
      const data = await apiGet<TeamUser[]>(`/api/users?${params}`)
      setMembers(data)
    } catch {
      setLoadError('Failed to load team members')
    } finally { setLoading(false) }
  }, [roleFilter, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    apiGet<Brand[]>('/api/products').then(setBrands).catch(() => {})
  }, [])

  const inviteForm = useForm<InviteData>({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'REP' } })
  const editForm = useForm<EditData>({ resolver: zodResolver(editSchema) })
  const editRole = useWatch({ control: editForm.control, name: 'role' })

  async function submitInvite(data: InviteData) {
    const result = await apiPost<{ tempPassword: string; firstName: string; email: string }>('/api/users', data)
    setShowInvite(false)
    inviteForm.reset()
    load()
    setTempPw({ name: `${data.firstName} ${data.lastName}`, email: data.email, password: result.tempPassword })
  }

  async function submitEdit(data: EditData) {
    if (!editing) return
    const isPM = data.role === 'PRODUCT_MANAGER'
    const isRep = data.role === 'REP'
    await apiPut(`/api/users/${editing.id}`, {
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isActive: data.isActive,
      managerId: isRep ? (data.managerId || null) : null,
      brandIds: isPM ? editBrandIds : [],
    })
    setEditing(null)
    load()
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await apiDelete(`/api/users/${deactivateTarget.id}`)
      setDeactivateTarget(null)
      load()
    } catch {
      alert('Failed to deactivate user')
    } finally {
      setDeactivating(false)
    }
  }

  async function handleResetPassword(m: TeamUser) {
    setResettingPw(true)
    try {
      const result = await apiPost<{ tempPassword: string }>(`/api/users/${m.id}/reset-password`, {})
      setEditing(null)
      setTempPw({ name: `${m.firstName} ${m.lastName}`, email: m.email, password: result.tempPassword })
    } catch {
      alert('Failed to reset password')
    } finally {
      setResettingPw(false)
    }
  }

  function openEdit(m: TeamUser) {
    setEditing(m)
    setEditBrandIds(m.assignedBrands.map((ab) => ab.brand.id))
    editForm.reset({
      firstName: m.firstName,
      lastName: m.lastName,
      role: m.role as EditData['role'],
      isActive: m.isActive,
      managerId: m.manager?.id ?? '',
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Team
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-lg text-sm font-semibold transition-colors">
            <UserPlus size={14} /> Invite Member
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="w-full bg-[#111111] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 outline-none focus:border-amber-400/50 transition-colors" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {ROLE_TABS.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                roleFilter === r ? 'bg-amber-400 text-black' : 'bg-[#111111] border border-[#262626] text-gray-400 hover:text-gray-200 hover:border-[#333]'
              )}>
              {r === 'All' ? 'All' : r === 'PRODUCT_MANAGER' ? 'PM' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#111111] border border-[#262626] rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-[#111111] border border-[#262626] rounded-xl py-16 text-center">
          <p className="text-red-400 text-sm">{loadError}</p>
          <button onClick={load} className="text-xs text-amber-400 mt-2 hover:text-amber-300">Retry</button>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-[#111111] border border-[#262626] rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">No team members found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className={cn(
              'bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3 transition-all',
              !m.isActive && 'opacity-50'
            )}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {getInitials(m.firstName, m.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  {m.phone && <p className="text-xs text-gray-600 truncate">{m.phone}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => openEdit(m)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-[#1e1e1e] transition-colors">
                      <Pencil size={12} />
                    </button>
                    {m.isActive && m.id !== user?.id && (
                      <button onClick={() => setDeactivateTarget(m)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-amber-400 hover:bg-amber-400/5 transition-colors"
                        title="Deactivate user">
                        <UserMinus size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', ROLE_COLORS[m.role] ?? 'bg-gray-500/15 text-gray-400')}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {m.role === 'REP' && (
                  <span className="text-xs text-gray-500">{m._count.assignedLeads} active lead{m._count.assignedLeads !== 1 ? 's' : ''}</span>
                )}
                {!m.isActive && <span className="text-xs text-red-400 font-medium">Inactive</span>}
              </div>

              {/* REP: show manager */}
              {m.role === 'REP' && (
                <div className="flex items-center gap-1.5">
                  <Users size={11} className="text-gray-600 flex-shrink-0" />
                  {m.manager ? (
                    <span className="text-xs text-gray-400">
                      Reports to <span className="text-gray-300 font-medium">{m.manager.firstName} {m.manager.lastName}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600 italic">No manager assigned</span>
                  )}
                </div>
              )}

              {/* MANAGER: show their REPs */}
              {m.role === 'MANAGER' && m.subordinates.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Team ({m.subordinates.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {m.subordinates.map((s) => (
                      <span key={s.id} className={cn(
                        'flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/5 border border-purple-500/15 rounded text-xs text-purple-400/80',
                        !s.isActive && 'opacity-40'
                      )}>
                        {getInitials(s.firstName, s.lastName)}
                        <span className="text-gray-500">{s.firstName}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {m.role === 'MANAGER' && m.subordinates.length === 0 && (
                <div className="flex items-center gap-1.5">
                  <Users size={11} className="text-gray-600 flex-shrink-0" />
                  <span className="text-xs text-gray-600 italic">No reps assigned</span>
                </div>
              )}

              {/* PM: show brands */}
              {m.role === 'PRODUCT_MANAGER' && (
                <div>
                  {m.assignedBrands.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No brands assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {m.assignedBrands.map(({ brand }) => (
                        <span key={brand.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/5 border border-amber-400/15 rounded text-xs text-amber-400/80">
                          <Package size={9} />
                          {brand.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <Modal title="Invite Team Member" onClose={() => { setShowInvite(false); inviteForm.reset() }}>
          <form onSubmit={inviteForm.handleSubmit(submitInvite)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" error={inviteForm.formState.errors.firstName?.message}>
                <input {...inviteForm.register('firstName')} className={inputClass} />
              </FormField>
              <FormField label="Last Name" error={inviteForm.formState.errors.lastName?.message}>
                <input {...inviteForm.register('lastName')} className={inputClass} />
              </FormField>
            </div>
            <FormField label="Email" error={inviteForm.formState.errors.email?.message}>
              <input {...inviteForm.register('email')} type="email" className={inputClass} />
            </FormField>
            <FormField label="Role">
              <select {...inviteForm.register('role')} className={inputClass}>
                <option value="REP">Rep</option>
                <option value="MANAGER">Manager</option>
                <option value="PRODUCT_MANAGER">Product Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </FormField>
            <p className="text-xs text-gray-600">A temporary password will be emailed. Manager assignment for Reps can be set after creation.</p>
            <button type="submit" disabled={inviteForm.formState.isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {inviteForm.formState.isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Send Invite
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title="Edit Member" onClose={() => setEditing(null)}>
          <div className="flex items-center gap-3 pb-3 border-b border-[#1a1a1a]">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-sm font-semibold">
              {getInitials(editing.firstName, editing.lastName)}
            </div>
            <div>
              <p className="text-sm text-gray-200">{editing.firstName} {editing.lastName}</p>
              <p className="text-xs text-gray-500">{editing.email}</p>
            </div>
          </div>
          <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" error={editForm.formState.errors.firstName?.message}>
                <input {...editForm.register('firstName')} className={inputClass} />
              </FormField>
              <FormField label="Last Name" error={editForm.formState.errors.lastName?.message}>
                <input {...editForm.register('lastName')} className={inputClass} />
              </FormField>
            </div>
            <FormField label="Role">
              <select {...editForm.register('role')} className={inputClass}>
                <option value="REP">Rep</option>
                <option value="MANAGER">Manager</option>
                <option value="PRODUCT_MANAGER">Product Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </FormField>

            {/* Manager assignment — shown for REP role */}
            {editRole === 'REP' && (
              <FormField label="Reports To (Manager)">
                <select {...editForm.register('managerId')} className={inputClass}>
                  <option value="">— No manager —</option>
                  {managers.filter((m) => m.id !== editing.id).map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
                {managers.length === 0 && (
                  <p className="text-xs text-gray-600 mt-1">No active managers found</p>
                )}
              </FormField>
            )}

            {/* Brand assignment — shown for PM role */}
            {editRole === 'PRODUCT_MANAGER' && (
              <BrandCheckboxes brands={brands} selected={editBrandIds} onChange={setEditBrandIds} />
            )}

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...editForm.register('isActive')} className="w-4 h-4 accent-amber-400" />
              <span className="text-sm text-gray-300">Active</span>
            </label>
            <button type="submit" disabled={editForm.formState.isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {editForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </form>
          <div className="pt-3 border-t border-[#1a1a1a]">
            <button
              onClick={() => handleResetPassword(editing)}
              disabled={resettingPw}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-amber-400 transition-colors disabled:opacity-50"
            >
              {resettingPw ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
              Reset password &amp; show temp password
            </button>
          </div>
        </Modal>
      )}

      {/* Temp Password Display */}
      {tempPw && (
        <TempPasswordBox
          name={tempPw.name}
          email={tempPw.email}
          password={tempPw.password}
          onClose={() => setTempPw(null)}
        />
      )}

      {/* Deactivate Confirm */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111111] border border-[#262626] rounded-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {getInitials(deactivateTarget.firstName, deactivateTarget.lastName)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">{deactivateTarget.firstName} {deactivateTarget.lastName}</p>
                <p className="text-xs text-gray-500">{deactivateTarget.email}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              This will deactivate the user. They will no longer be able to log in, but their data will be preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeactivateTarget(null)}
                className="flex-1 px-3 py-2.5 border border-[#262626] rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:border-[#333] transition-colors">
                Cancel
              </button>
              <button onClick={handleDeactivate} disabled={deactivating}
                className="flex-1 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {deactivating ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
