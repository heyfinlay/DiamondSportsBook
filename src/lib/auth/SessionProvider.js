import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient";
const SessionContext = createContext({
    user: null,
    session: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => ({ error: null })
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
    const signIn = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { error };
    };
    const signUp = async ({ email, password, username, icNumber }) => {
        const trimmedUsername = username.trim();
        const trimmedIc = icNumber.trim();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: trimmedUsername,
                    ic_number: trimmedIc
                }
            }
        });
        if (error) {
            return { error };
        }
        const userId = data.user?.id;
        if (userId) {
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({ id: userId, username: trimmedUsername, ic_phone_number: trimmedIc }, { onConflict: "id" });
            if (profileError) {
                console.error(profileError);
                return { error: new Error(profileError.message) };
            }
        }
        return { error: null };
    };
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };
    const value = useMemo(() => ({ user, session, loading, signIn, signUp, signOut }), [user, session, loading]);
    return (_jsx(SessionContext.Provider, { value: value, children: children }));
};
export const useSession = () => useContext(SessionContext);
