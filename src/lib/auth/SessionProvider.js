import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient";
const SessionContext = createContext({
    user: null,
    session: null,
    loading: true
});
export const SessionProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);
        });
        return () => {
            subscription.unsubscribe();
        };
    }, []);
    const value = useMemo(() => ({ user, session, loading }), [user, session, loading]);
    return (_jsx(SessionContext.Provider, { value: value, children: children }));
};
export const useSession = () => useContext(SessionContext);
