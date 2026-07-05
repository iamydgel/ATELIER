import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from './lib/queryKeys'
import { apiRequest } from './lib/api'
import type { User } from './lib/types'
import { Spinner } from './components/ui/Spinner'

import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Chat from './pages/Chat'
import Models from './pages/Models'
import Settings from './pages/Settings'
import Observability from './pages/Observability'

// Guard for authenticated routes + onboarding check
function PrivateRoute() {
  const { data: user, isLoading, isError } = useQuery<User | null>({
    queryKey: QUERY_KEYS.me,
    queryFn: () => apiRequest<User>('/auth/me'),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-0">
        <Spinner size={32} />
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  const onboarded = localStorage.getItem('atelier:onboarded') === 'true'
  if (!onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

// Guard specifically for onboarding flow (requires auth, ignores onboarded flag)
function OnboardingRoute() {
  const { data: user, isLoading, isError } = useQuery<User | null>({
    queryKey: QUERY_KEYS.me,
    queryFn: () => apiRequest<User>('/auth/me'),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-0">
        <Spinner size={32} />
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public auth route */}
      <Route path="/login" element={<Login />} />

      {/* Onboarding flow */}
      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* Main console private routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Chat />} />
        <Route path="/chat/:conversationId" element={<Chat />} />
        <Route path="/models" element={<Models />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/observability" element={<Observability />} />
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
