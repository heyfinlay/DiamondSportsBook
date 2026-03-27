import { useQuery } from "@tanstack/react-query";
import { supabase } from "@lib/supabaseClient";
import { useSession } from "./SessionProvider";
export function usePermissions() {
    const { user } = useSession();
    const { data, isLoading } = useQuery({
        queryKey: ["user-roles", user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return {
                    userRoles: [],
                    profile: null
                };
            }
            const [{ data: userRoles, error: userRolesError }, { data: profile, error: profileError }] = await Promise.all([
                supabase.from("user_roles").select("role").eq("user_id", user.id),
                supabase.from("profiles").select("role, permissions").eq("id", user.id).maybeSingle()
            ]);
            if (userRolesError) {
                console.error("Error fetching user roles:", userRolesError);
            }
            if (profileError) {
                console.error("Error fetching profile permissions:", profileError);
            }
            return {
                userRoles: (userRoles ?? []),
                profile: profile ?? null
            };
        },
        enabled: !!user?.id
    });
    const roleSet = new Set();
    for (const role of data?.userRoles ?? []) {
        if (role.role)
            roleSet.add(role.role);
    }
    if (data?.profile?.role) {
        roleSet.add(data.profile.role);
    }
    for (const permission of data?.profile?.permissions ?? []) {
        if (permission)
            roleSet.add(permission);
    }
    const isSportsbookAdmin = roleSet.has("sportsbook_admin");
    const isBettingAdmin = roleSet.has("betting_admin") || isSportsbookAdmin || roleSet.has("super_admin");
    return {
        roles: Array.from(roleSet),
        loading: isLoading,
        hasRole: (role) => roleSet.has(role),
        hasAnyRole: (...checkRoles) => checkRoles.some((role) => roleSet.has(role)),
        hasAllRoles: (...checkRoles) => checkRoles.every((role) => roleSet.has(role)),
        isRaceControl: roleSet.has("race_control"),
        isMarshal: roleSet.has("marshal"),
        isBettingAdmin,
        isSportsbookAdmin,
        isSuperAdmin: roleSet.has("super_admin"),
        canManageRace: roleSet.has("race_control") || roleSet.has("super_admin"),
        canLogLaps: roleSet.has("marshal") || roleSet.has("race_control") || roleSet.has("super_admin")
    };
}
