import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet, Navigate } from 'react-router-dom'
import type { RootState } from '../store/store'
import { refreshAsync } from '../store/slices/authSlice'

function ProtectedRoute() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
  const authToken = useSelector((s: RootState) => s.auth.authToken)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (!isAuthenticated || !authToken) {
          const stored = localStorage.getItem('refreshToken') || ''
          if (stored) {
            try {
              await dispatch(refreshAsync(stored) as any)
            } catch {}
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (bootstrapping) {
    return null
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export default ProtectedRoute


