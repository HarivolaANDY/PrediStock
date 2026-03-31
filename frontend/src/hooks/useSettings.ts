import { useState, useEffect } from 'react'

interface Settings {
  darkMode: boolean
  themeColor: string
  language: string
  companyName: string
  timezone: string
  dateFormat: string
  currency: string
  twoFactorAuth: boolean
  criticalAlerts: boolean
  autoBackup: boolean
}

const defaultSettings: Settings = {
  darkMode: false,
  themeColor: 'blue',
  language: 'en',
  companyName: 'Predistock Inc.',
  timezone: 'utc',
  dateFormat: 'mdy',
  currency: 'usd',
  twoFactorAuth: false,
  criticalAlerts: true,
  autoBackup: true,
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('predistock-settings')
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('predistock-settings', JSON.stringify(settings))
    
    // Apply dark mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Apply theme color by updating CSS variables
    const root = document.documentElement
    switch (settings.themeColor) {
      case 'green':
        root.style.setProperty('--primary', '142 69 173') // Emerald
        break
      case 'purple':
        root.style.setProperty('--primary', '139 92 246') // Purple
        break
      case 'orange':
        root.style.setProperty('--primary', '245 158 11') // Orange
        break
      default:
        root.style.setProperty('--primary', '37 99 235') // Blue
    }
  }, [settings])

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  return { settings, updateSettings }
}