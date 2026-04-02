'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Building2, BarChart3, Menu } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useUIStore } from '@/store/uiStore'

const mobileNav = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/customers', label: 'Customers', icon: Building2 },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { toggleSidebar } = useUIStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#111111] border-t border-[#262626] md:hidden">
      <div className="flex items-center justify-around h-16">
        {mobileNav.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors',
                active ? 'text-amber-400' : 'text-gray-500'
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-gray-500"
        >
          <Menu size={20} />
          More
        </button>
      </div>
    </nav>
  )
}
