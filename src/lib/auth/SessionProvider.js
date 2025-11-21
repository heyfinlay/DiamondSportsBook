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
    useEffect(() => {
        if (!user)
            return;
        const derivedUsername = user.user_metadata?.username ??
            user.user_metadata?.user_name ??
            user.user_metadata?.full_name ??
            (user.email ? user.email.split("@")[0] : "");
        const icNumber = user.user_metadata?.ic_number ?? "";
        const updates = { id: user.id };
        if (derivedUsername) {
            updates.username = derivedUsername;
        }
        if (icNumber) {
            updates.ic_phone_number = icNumber;
        }
        if (!updates.username && !updates.ic_phone_number) {
            return;
        }
        const syncProfile = async () => {
            try {
                await supabase.from("profiles").upsert(updates, { onConflict: "id" });
            }
            catch (err) {
                console.error("Failed to sync profile metadata", err);
            }
        };
        void syncProfile();
    }, [user]);
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
        if (!trimmedUsername || !trimmedIc) {
            return { error: new Error("Username and IC number are required.") };
        }
        const { data: existingUsername, error: usernameCheckError } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", trimmedUsername)
            .maybeSingle();
        if (usernameCheckError &&
            usernameCheckError.code !== "PGRST116") {
            return { error: usernameCheckError };
        }
        if (existingUsername) {
            return { error: new Error("That username is already taken.") };
        }
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
