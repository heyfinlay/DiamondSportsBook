import { supabase } from "@lib/supabaseClient";

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  ic_number: string | null;
  ic_phone_number: string | null;
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, ic_number, ic_phone_number")
    .eq("id", userId)
    .single();

  if (error) {
    // If profile doesn't exist, return null
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
};

export const updateUserProfile = async (
  userId: string,
  updates: {
    username?: string;
    display_name?: string;
    ic_number?: string;
    ic_phone_number?: string;
  }
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id, username, display_name, ic_number, ic_phone_number")
    .single();

  if (error) throw error;
  return data;
};
