import React, { useState, useEffect } from 'react'
import { SidebarContext, SidebarState } from './SidebarContext'

interface SidebarProviderProps {
  children: React.ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [state, setState] = useState<SidebarState>('expanded')
  const [isMobile, setIsMobile] = useState(false)

  // Gestion du responsive
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen)
    } else {
      setState(state === 'expanded' ? 'collapsed' : 'expanded')
    }
  }

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false)
    }
  }

  const value = {
    isOpen,
    isMobile,
    state,
    toggleSidebar,
    closeSidebar,
    setState
  }

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}