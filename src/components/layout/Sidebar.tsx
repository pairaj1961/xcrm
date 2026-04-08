'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  FileText,
  BarChart3,
  Settings,
  UserCircle,
  Shield,
  UserCog,
  X,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { getInitials } from '@/utils/format'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN'] },
  { href: '/leads', label: 'Leads', icon: Users, roles: ['REP', 'MANAGER', 'ADMIN'] },
  { href: '/customers', label: 'Customers', icon: Building2, roles: ['REP', 'MANAGER', 'ADMIN'] },
  { href: '/products', label: 'Products', icon: Package, roles: ['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN'] },
  { href: '/quotes', label: 'Quotes', icon: FileText, roles: ['REP', 'MANAGER', 'ADMIN'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['REP', 'MANAGER', 'PRODUCT_MANAGER', 'ADMIN'] },
  { href: '/team', label: 'Team', icon: UserCog, roles: ['MANAGER', 'ADMIN'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
  { href: '/audit', label: 'Audit Log', icon: Shield, roles: ['ADMIN'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [rentalBadge, setRentalBadge] = useState(0)

  useEffect(() => {
    if (!user) return
    fetch('/api/rental/stats', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { activeRentalCustomers: number }) => setRentalBadge(d.activeRentalCustomers ?? 0))
      .catch(() => setRentalBadge(0))
  }, [user])

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role))

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-60 flex flex-col bg-[#111111] border-r border-[#262626]',
          'transition-transform duration-200',
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#262626]">
          <span className="text-amber-400 font-bold text-xl tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            xCRM
          </span>
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors',
                  active
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-100'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Rental APP link */}
        <div className="border-t border-[#262626] mt-2 pt-2 px-2">
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-100 transition-colors"
          >
            <ExternalLink size={16} />
            <span className="flex-1">Rental APP</span>
            {rentalBadge > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 min-w-[18px] text-center">
                {rentalBadge}
              </span>
            )}
          </a>
        </div>

        {/* User */}
        {user && (
          <div className="border-t border-[#262626] p-3">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-100 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{user.role.replace('_', ' ')}</p>
              </div>
              <UserCircle size={14} className="text-gray-600 ml-auto flex-shrink-0" />
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
