import { useQuery } from '@tanstack/react-query';
import { supabase } from '@lib/supabaseClient';
import { useSession } from './SessionProvider';
/**
 * Hook to check user permissions based on roles in the database
 */
export function usePermissions() {
    const { user } = useSession();
    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['user-roles', user?.id],
        queryFn: async () => {
            if (!user?.id)
                return [];
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id);
            if (error) {
                console.error('Error fetching user roles:', error);
                return [];
            }
            return data;
        },
        enabled: !!user?.id,
    });
    const roleSet = new Set(roles.map((r) => r.role));
    const isSportsbookAdmin = roleSet.has('sportsbook_admin');
    const isBettingAdmin = roleSet.has('betting_admin') || isSportsbookAdmin;
    return {
        roles: Array.from(roleSet),
        loading: isLoading,
        hasRole: (role) => roleSet.has(role),
        hasAnyRole: (...checkRoles) => checkRoles.some((r) => roleSet.has(r)),
        hasAllRoles: (...checkRoles) => checkRoles.every((r) => roleSet.has(r)),
        // Common permission checks
        isRaceControl: roleSet.has('race_control'),
        isMarshal: roleSet.has('marshal'),
        isBettingAdmin,
        isSuperAdmin: roleSet.has('super_admin'),
        canManageRace: roleSet.has('race_control') || roleSet.has('super_admin'),
        canLogLaps: roleSet.has('marshal') || roleSet.has('race_control') || roleSet.has('super_admin'),
    };
}
