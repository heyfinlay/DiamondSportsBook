import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabaseClient'
import { useSession } from './SessionProvider'

interface UserRole {
  role: string
}

/**
 * Hook to check user permissions based on roles in the database
 */
export function usePermissions() {
  const { user } = useSession()

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching user roles:', error)
        return []
      }

      return data as UserRole[]
    },
    enabled: !!user?.id,
  })

  const roleSet = new Set(roles.map((r) => r.role))

  return {
    roles: Array.from(roleSet),
    loading: isLoading,
    hasRole: (role: string) => roleSet.has(role),
    hasAnyRole: (...checkRoles: string[]) => checkRoles.some((r) => roleSet.has(r)),
    hasAllRoles: (...checkRoles: string[]) => checkRoles.every((r) => roleSet.has(r)),
    // Common permission checks
    isRaceControl: roleSet.has('race_control'),
    isMarshal: roleSet.has('marshal'),
    isBettingAdmin: roleSet.has('betting_admin'),
    isSuperAdmin: roleSet.has('super_admin'),
    canManageRace: roleSet.has('race_control') || roleSet.has('super_admin'),
    canLogLaps: roleSet.has('marshal') || roleSet.has('race_control') || roleSet.has('super_admin'),
  }
}
