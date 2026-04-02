'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { getInitials, formatRelativeDate } from '@/utils/format'
import { cn } from '@/lib/cn'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil, Trash2, X, Loader2 } from 'lucide-react'

interface TeamUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  phone?: string | null
  isActive: boolean
  createdAt: string
  assignedBrands: Array<{ brand: { id: string; name: string } }>
  _count: { assignedLeads: number }
}

const ROLE_COLORS: Record<string, string> = {
  REP: 'bg-blue-500/15 text-blue-400',
  MANAGER: 'bg-purple-500/15 text-purple-400',
  PRODUCT_MANAGER: 'bg-amber-500/15 text-amber-400',
  ADMIN: 'bg-red-500/15 text-red-400',
}

const ROLE_TABS = ['All', 'REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']),
})
type InviteData = z.infer<typeof inviteSchema>

const editSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN']),
  isActive: z.boolean(),
})
type EditData = z.infer<typeof editSchema>

export default function TeamPage() {
  const { user } = useAuthStore()
  const [members, setMembers] = useState<TeamUser[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<TeamUser | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== 'All') params.set('role', roleFilter)
      if (search) params.set('search', search)
      const data = await apiGet<TeamUser[]>(`/api/users?${params}`)
      setMembers(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [roleFilter, search])

  useEffect(() => { load() }, [load])

  const inviteForm = useForm<InviteData>({ resolver: zodResolver(inviteSchema) })
  const editForm = useForm<EditData>({ resolver: zodResolver(editSchema) })

  async function submitInvite(data: InviteData) {
    await apiPost('/api/users', data)
    setShowInvite(false)
    inviteForm.reset()
    load()
  }

  async function submitEdit(data: EditData) {
    if (!editing) return
    await apiPut(`/api/users/${editing.id}`, data)
    setEditing(null)
    load()
  }

  async function handleDelete(id: string) {
    await apiDelete(`/api/users/${id}`)
    setDeleteConfirm(null)
    load()
  }

  function openEdit(m: TeamUser) {
    setEditing(m)
    editForm.reset({ firstName: m.firstName, lastName: m.lastName, role: m.role as InviteData['role'], isActive: m.isActive })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-300 outline-none w-48"
        />
        <div className="flex gap-1">
          {ROLE_TABS.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors', roleFilter === r ? 'bg-amber-400 text-black' : 'bg-[#111111] border border-[#262626] text-gray-400')}
            >
              {r === 'PRODUCT_MANAGER' ? 'PM' : r}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-lg text-sm font-semibold transition-colors">
            <UserPlus size={14} />
            Invite Member
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-[#111111] border border-[#262626] rounded-xl h-32 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className={cn('bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3', !m.isActive && 'opacity-50')}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {getInitials(m.firstName, m.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                </div>
                {user?.role === 'ADMIN' && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(m)} className="p-1 text-gray-600 hover:text-gray-300">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteConfirm(m.id)} className="p-1 text-gray-600 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', ROLE_COLORS[m.role] ?? 'bg-gray-500/15 text-gray-400')}>
                  {m.role.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-500">{m._count.assignedLeads} open leads</span>
                {!m.isActive && <span className="text-xs text-red-400">Inactive</span>}
              </div>
              {m.role === 'PRODUCT_MANAGER' && m.assignedBrands.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.assignedBrands.map(({ brand }) => (
                    <span key={brand.id} className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#262626] rounded text-xs text-gray-400">
                      {brand.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111111] border border-[#262626] rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-100">Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
            </div>
            <form onSubmit={inviteForm.handleSubmit(submitInvite)} className="space-y-3">
              {(['firstName', 'lastName', 'email'] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs text-gray-500 block mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
                  <input {...inviteForm.register(f)} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
                  {inviteForm.formState.errors[f] && <p className="text-xs text-red-400 mt-1">{inviteForm.formState.errors[f]?.message}</p>}
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role</label>
                <select {...inviteForm.register('role')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none">
                  <option value="REP">REP</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <button type="submit" disabled={inviteForm.formState.isSubmitting}
                className="w-full bg-amber-400 hover:bg-amber-300 text-black font-semibold py-2 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {inviteForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Send Invite
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111111] border border-[#262626] rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-100">Edit Member</h2>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
            </div>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-3">
              {(['firstName', 'lastName'] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs text-gray-500 block mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
                  <input {...editForm.register(f)} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role</label>
                <select {...editForm.register('role')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none">
                  <option value="REP">REP</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...editForm.register('isActive')} className="w-4 h-4 accent-amber-400" />
                <span className="text-sm text-gray-300">Active</span>
              </label>
              <button type="submit" disabled={editForm.formState.isSubmitting}
                className="w-full bg-amber-400 hover:bg-amber-300 text-black font-semibold py-2 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {editForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111111] border border-[#262626] rounded-xl w-full max-w-sm p-6 space-y-4 text-center">
            <p className="text-gray-300">Are you sure you want to deactivate this user?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-3 py-2 border border-[#262626] rounded-lg text-sm text-gray-400">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
