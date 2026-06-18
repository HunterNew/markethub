import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

export type ThemeId = 'default' | 'tekmarts' | 'darkglass'

interface ThemeContextType {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
  loading: boolean
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'default', setTheme: () => {}, loading: true })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('default')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/settings/theme')
      .then(r => {
        const t = r.data.theme || 'default'
        setThemeState(t)
        document.documentElement.setAttribute('data-theme', t)
        applyBodyTheme(t)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setTheme = (t: ThemeId) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    applyBodyTheme(t)
  }

  function applyBodyTheme(t: ThemeId) {
    document.body.classList.remove('theme-darkglass')
    if (t === 'darkglass') document.body.classList.add('theme-darkglass')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
