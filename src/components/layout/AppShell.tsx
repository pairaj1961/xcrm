'use client'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'
import BottomNav from './BottomNav'
import AssistantPanel from '@/components/assistant/AssistantPanel'
import AuthProvider from '@/components/providers/AuthProvider'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-full">
        <Sidebar />
        <div className="md:ml-60">
          <TopHeader />
          <main className="pt-14 pb-16 md:pb-0 min-h-screen">
            {children}
          </main>
        </div>
        <BottomNav />
        <AssistantPanel />
      </div>
    </AuthProvider>
  )
}
