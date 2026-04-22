import { createContext, useContext } from 'react'

export type SidebarState = 'expanded' | 'collapsed'

export interface SidebarContextType {
  isOpen: boolean
  isMobile: boolean
  state: SidebarState
  toggleSidebar: () => void
  closeSidebar: () => void
  setState: (state: SidebarState) => void
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}