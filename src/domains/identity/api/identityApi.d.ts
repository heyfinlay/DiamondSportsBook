export interface Profile {
    id: string;
    display_name: string;
    role: string;
    permissions: string[];
}
export declare const fetchProfile: () => Promise<Profile | null>;
