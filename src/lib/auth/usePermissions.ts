import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabaseClient'
import { useSession } from './SessionProvider'

interface UserRole {
  role: string
}

interface RoleQueryResult {
  roles: UserRole[]
  profileRole: string | null
}

/**
 * Hook to check user permissions based on roles in the database
 */
export function usePermissions() {
  const { user } = useSession()

  const { data, isLoading } = useQuery<RoleQueryResult>({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return { roles: [], profileRole: null }

      const [{ data: roleRows, error: roleError }, { data: profileRow, error: profileError }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
      ])

      if (roleError) {
        console.error('Error fetching user roles:', roleError)
      }

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile role:', profileError)
      }

      return {
        roles: (roleRows as UserRole[]) ?? [],
        profileRole: profileRow?.role ?? null
      }
    },
    enabled: !!user?.id,
  })

  const roleSet = new Set<string>((data?.roles ?? []).map((r) => r.role))
  if (data?.profileRole) {
    roleSet.add(data.profileRole)
  }
  const isSportsbookAdmin = roleSet.has('sportsbook_admin')
  const isBettingAdmin = roleSet.has('betting_admin') || isSportsbookAdmin

  return {
    roles: Array.from(roleSet),
    loading: isLoading,
    hasRole: (role: string) => roleSet.has(role),
    hasAnyRole: (...checkRoles: string[]) => checkRoles.some((r) => roleSet.has(r)),
    hasAllRoles: (...checkRoles: string[]) => checkRoles.every((r) => roleSet.has(r)),
    // Common permission checks
    isRaceControl: roleSet.has('race_control'),
    isMarshal: roleSet.has('marshal'),
    isBettingAdmin,
    isSuperAdmin: roleSet.has('super_admin'),
    canManageRace: roleSet.has('race_control') || roleSet.has('super_admin'),
    canLogLaps: roleSet.has('marshal') || roleSet.has('race_control') || roleSet.has('super_admin'),
  }
}
