import { supabase } from "@lib/supabase/client";
export const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, username, ic_phone_number")
        .eq("id", userId)
        .single();
    if (error) {
        // If profile doesn't exist, return null
        if (error.code === "PGRST116")
            return null;
        throw error;
    }
    return data;
};
export const updateUserProfile = async (userId, updates) => {
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select("id, username, ic_phone_number")
        .single();
    if (error)
        throw error;
    return data;
};
