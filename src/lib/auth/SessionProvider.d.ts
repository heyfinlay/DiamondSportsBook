import { type ReactNode } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
type SessionActionResult = {
    error: AuthError | Error | null;
};
interface SignUpParams {
    email: string;
    password: string;
    username: string;
    icNumber: string;
}
interface SessionContextValue {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<SessionActionResult>;
    signUp: (params: SignUpParams) => Promise<SessionActionResult>;
    signOut: () => Promise<SessionActionResult>;
}
export declare const SessionProvider: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useSession: () => SessionContextValue;
export {};
