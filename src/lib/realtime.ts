import { supabase } from "./supabaseClient";

export const subscribeToChannel = (
  name: string,
  config: Parameters<typeof supabase.channel>[1]
) => {
  const channel = supabase.channel(name, config);
  return channel;
};
