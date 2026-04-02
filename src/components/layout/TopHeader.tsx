'use client'
import { Menu, Bot } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/customers': 'Customers',
  '/products': 'Products',
  '/quotes': 'Quotes',
  '/reports': 'Reports',
  '/team': 'Team',
  '/settings': 'Settings',
  '/audit': 'Audit Log',
  '/profile': 'Profile',
}

function getTitle(pathname: string): string {
  for (const [prefix, label] of Object.entries(pageTitles)) {
    if (pathname.startsWith(prefix)) return label
  }
  return 'xCRM'
}

export default function TopHeader() {
  const { toggleSidebar, toggleAssistant } = useUIStore()
  const { user } = useAuthStore()
  const pathname = usePathname()

  return (
    <header className="h-14 bg-[#111111] border-b border-[#262626] flex items-center px-4 gap-3 fixed top-0 left-0 right-0 md:left-60 z-30">
      <button
        className="md:hidden text-gray-400 hover:text-white p-1"
        onClick={toggleSidebar}
      >
        <Menu size={20} />
      </button>

      <h1
        className="text-base font-semibold text-gray-100 flex-1"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em' }}
      >
        {getTitle(pathname)}
      </h1>

      <button
        onClick={toggleAssistant}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 text-xs font-medium transition-colors"
        title="AI Assistant"
      >
        <Bot size={14} />
        <span className="hidden sm:inline">Assistant</span>
      </button>
    </header>
  )
}
