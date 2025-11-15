import { supabase } from "./supabaseClient";
export const subscribeToChannel = (name, config) => {
    const channel = supabase.channel(name, config);
    return channel;
};
