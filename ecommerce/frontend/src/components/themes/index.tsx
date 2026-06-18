import React, { lazy, Suspense } from 'react'
import { useTheme } from '../../context/ThemeContext'

// Default components (imported directly since they're the primary theme)
import DefaultHeader from '../layout/Header'
import DefaultFooter from '../layout/Footer'
import DefaultHome from '../../pages/Home'

// TekMarts theme (lazy loaded)
const TekMartsHeader = lazy(() => import('./tekmarts/Header'))
const TekMartsFooter = lazy(() => import('./tekmarts/Footer'))
const TekMartsHome = lazy(() => import('./tekmarts/Home'))

// Dark Glass theme (lazy loaded)
const DarkGlassHeader = lazy(() => import('./darkglass/Header'))
const DarkGlassFooter = lazy(() => import('./darkglass/Footer'))
const DarkGlassHome = lazy(() => import('./darkglass/Home'))

function ThemeFallback() {
  return <div className="h-16 bg-gray-100 animate-pulse" />
}

export function ThemedHeader() {
  const { theme } = useTheme()
  if (theme === 'tekmarts') return <Suspense fallback={<ThemeFallback />}><TekMartsHeader /></Suspense>
  if (theme === 'darkglass') return <Suspense fallback={<ThemeFallback />}><DarkGlassHeader /></Suspense>
  return <DefaultHeader />
}

export function ThemedFooter() {
  const { theme } = useTheme()
  if (theme === 'tekmarts') return <Suspense fallback={<div />}><TekMartsFooter /></Suspense>
  if (theme === 'darkglass') return <Suspense fallback={<div />}><DarkGlassFooter /></Suspense>
  return <DefaultFooter />
}

export function ThemedHome() {
  const { theme } = useTheme()
  if (theme === 'tekmarts') return <Suspense fallback={<div className="min-h-screen" />}><TekMartsHome /></Suspense>
  if (theme === 'darkglass') return <Suspense fallback={<div className="min-h-screen" />}><DarkGlassHome /></Suspense>
  return <DefaultHome />
}
