/**
 * Hook to check user permissions based on roles in the database
 */
export declare function usePermissions(): {
    roles: string[];
    loading: boolean;
    hasRole: (role: string) => boolean;
    hasAnyRole: (...checkRoles: string[]) => boolean;
    hasAllRoles: (...checkRoles: string[]) => boolean;
    isRaceControl: boolean;
    isMarshal: boolean;
    isBettingAdmin: boolean;
    isSuperAdmin: boolean;
    canManageRace: boolean;
    canLogLaps: boolean;
};
