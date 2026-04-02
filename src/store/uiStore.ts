'use client'
import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  assistantOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setAssistantOpen: (open: boolean) => void
  toggleAssistant: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  assistantOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),
}))
