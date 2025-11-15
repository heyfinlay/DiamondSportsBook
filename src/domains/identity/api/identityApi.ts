import { supabase } from "@lib/supabaseClient";

export interface Profile {
  id: string;
  display_name: string;
  role: string;
  permissions: string[];
}

export const fetchProfile = async (): Promise<Profile | null> => {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return data as Profile;
};
