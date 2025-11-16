import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from './SessionProvider'
import { usePermissions } from './usePermissions'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: string | string[]
  requireAnyRole?: string[]
  requireAllRoles?: string[]
}

/**
 * Protected route wrapper that requires authentication and optional role checks
 */
export function ProtectedRoute({
  children,
  requireRole,
  requireAnyRole,
  requireAllRoles,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useSession()
  const { hasRole, hasAnyRole, hasAllRoles, loading: permissionsLoading } = usePermissions()
  const location = useLocation()

  // Show nothing while loading
  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role requirements if specified
  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole]
    if (!roles.some((role) => hasRole(role))) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-slate-400">You don't have permission to access this page.</p>
            <p className="text-sm text-slate-500 mt-2">
              Required role: {roles.join(' or ')}
            </p>
          </div>
        </div>
      )
    }
  }

  if (requireAnyRole && !hasAnyRole(...requireAnyRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400">You don't have permission to access this page.</p>
          <p className="text-sm text-slate-500 mt-2">
            Required role: {requireAnyRole.join(' or ')}
          </p>
        </div>
      </div>
    )
  }

  if (requireAllRoles && !hasAllRoles(...requireAllRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400">You don't have all required permissions.</p>
          <p className="text-sm text-slate-500 mt-2">
            Required roles: {requireAllRoles.join(', ')}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
