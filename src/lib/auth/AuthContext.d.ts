import { User, Session, AuthError } from '@supabase/supabase-js';
interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{
        error: AuthError | null;
    }>;
    signUp: (email: string, password: string) => Promise<{
        error: AuthError | null;
    }>;
    signOut: () => Promise<{
        error: AuthError | null;
    }>;
}
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextType;
export {};
