import { type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
interface SessionContextValue {
    user: User | null;
    session: Session | null;
    loading: boolean;
}
export declare const SessionProvider: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useSession: () => SessionContextValue;
export {};
