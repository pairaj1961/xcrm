'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPut, apiPost } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle, LogOut } from 'lucide-react'

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
})
type ProfileData = z.infer<typeof profileSchema>

const pwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type PwData = z.infer<typeof pwSchema>

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore()
  const router = useRouter()
  const [profileSaved, setProfileSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    router.push('/login')
  }

  const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema) })
  const pwForm = useForm<PwData>({ resolver: zodResolver(pwSchema) })

  useEffect(() => {
    apiGet<ProfileData & { email: string; role: string }>('/api/profile').then((data) => {
      profileForm.reset({ firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? '' })
    }).catch(() => {})
  }, [profileForm])

  async function onSaveProfile(data: ProfileData) {
    const updated = await apiPut<typeof user>('/api/profile', data)
    setUser(updated)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  async function onChangePassword(data: PwData) {
    setPwError('')
    try {
      await apiPost('/api/profile/password', { currentPassword: data.currentPassword, newPassword: data.newPassword })
      setPwSaved(true)
      pwForm.reset()
      setTimeout(() => setPwSaved(false), 2000)
    } catch (e) {
      setPwError((e as Error).message)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-xl space-y-6">
      {/* Profile Info */}
      <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="bg-[#111111] border border-[#262626] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-lg font-bold">
            {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-300">Personal Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">First Name</label>
            <input {...profileForm.register('firstName')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
            {profileForm.formState.errors.firstName && <p className="text-xs text-red-400 mt-1">{profileForm.formState.errors.firstName.message}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Last Name</label>
            <input {...profileForm.register('lastName')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Phone</label>
          <input {...profileForm.register('phone')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" placeholder="+66 xx xxx xxxx" />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Email (read-only)</label>
          <p className="px-3 py-2 text-sm text-gray-500">{user?.email}</p>
        </div>

        <button type="submit" disabled={profileForm.formState.isSubmitting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-lg text-sm disabled:opacity-60">
          {profileForm.formState.isSubmitting ? <Loader2 size={14} className="animate-spin" /> : profileSaved ? <CheckCircle size={14} /> : null}
          {profileSaved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="bg-[#111111] border border-[#262626] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Change Password</h2>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Current Password</label>
          <input type="password" {...pwForm.register('currentPassword')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">New Password</label>
          <input type="password" {...pwForm.register('newPassword')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
          {pwForm.formState.errors.newPassword && <p className="text-xs text-red-400 mt-1">{pwForm.formState.errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Confirm New Password</label>
          <input type="password" {...pwForm.register('confirm')} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-amber-400/50" />
          {pwForm.formState.errors.confirm && <p className="text-xs text-red-400 mt-1">{pwForm.formState.errors.confirm.message}</p>}
        </div>

        {pwError && <p className="text-sm text-red-400">{pwError}</p>}

        <button type="submit" disabled={pwForm.formState.isSubmitting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-lg text-sm disabled:opacity-60">
          {pwForm.formState.isSubmitting ? <Loader2 size={14} className="animate-spin" /> : pwSaved ? <CheckCircle size={14} /> : null}
          {pwSaved ? 'Password Changed!' : 'Change Password'}
        </button>
      </form>

      {/* Logout */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 border border-red-400/20 rounded-lg hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
