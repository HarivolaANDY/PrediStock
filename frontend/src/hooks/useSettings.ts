import { useState, useEffect, useCallback } from 'react'

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
    
    // Apply theme color class to body
    const themes = ['blue', 'green', 'purple', 'orange']
    document.body.classList.remove(...themes)
    document.body.classList.add(settings.themeColor)
    
    // Also update CSS variables for components that don't use the primary color directly
    const root = document.documentElement
    const themeColors: Record<string, { primary: string; sidebar: string; ring: string }> = {
      blue: { primary: '217 91% 60%', sidebar: '217 91% 40%', ring: '217 91% 60%' },
      green: { primary: '160 84% 39%', sidebar: '160 84% 39%', ring: '160 84% 39%' },
      purple: { primary: '252 83% 68%', sidebar: '252 83% 68%', ring: '252 83% 68%' },
      orange: { primary: '43 96% 51%', sidebar: '43 96% 51%', ring: '43 96% 51%' }
    }
    
    const config = themeColors[settings.themeColor] || themeColors.blue
    root.style.setProperty('--primary', config.primary)
    root.style.setProperty('--sidebar-background', config.sidebar)
    root.style.setProperty('--ring', config.ring)
  }, [settings])

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  return { settings, updateSettings }
}