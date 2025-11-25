export interface UserProfile {
    id: string;
    username: string | null;
    display_name: string | null;
    ic_number: string | null;
}
export declare const fetchUserProfile: (userId: string) => Promise<UserProfile | null>;
export declare const updateUserProfile: (userId: string, updates: {
    username?: string;
    display_name?: string;
    ic_number?: string;
}) => Promise<UserProfile>;
