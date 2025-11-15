import { supabase } from "./supabaseClient";
export declare const subscribeToChannel: (name: string, config: Parameters<typeof supabase.channel>[1]) => import("@supabase/supabase-js").RealtimeChannel;
