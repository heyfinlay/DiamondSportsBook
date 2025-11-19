export interface UserProfile {
    id: string;
    username: string | null;
    ic_phone_number: string | null;
}
export declare const fetchUserProfile: (userId: string) => Promise<UserProfile | null>;
export declare const updateUserProfile: (userId: string, updates: {
    username?: string;
    ic_phone_number?: string;
}) => Promise<UserProfile>;
