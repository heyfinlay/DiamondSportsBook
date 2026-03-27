export declare function usePermissions(): {
    roles: string[];
    loading: boolean;
    hasRole: (role: string) => boolean;
    hasAnyRole: (...checkRoles: string[]) => boolean;
    hasAllRoles: (...checkRoles: string[]) => boolean;
    isRaceControl: boolean;
    isMarshal: boolean;
    isBettingAdmin: boolean;
    isSportsbookAdmin: boolean;
    isSuperAdmin: boolean;
    canManageRace: boolean;
    canLogLaps: boolean;
};
