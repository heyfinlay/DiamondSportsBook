import { createClient } from "@supabase/supabase-js";
const resolveEnv = (keys) => {
    for (const key of keys) {
        const value = import.meta.env[key];
        if (value)
            return value;
    }
    return undefined;
};
const supabaseUrl = resolveEnv(["VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
const supabaseAnonKey = resolveEnv([
    "VITE_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
]);
if (!supabaseUrl) {
    throw new Error("Supabase URL is not defined. Add VITE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) to your env.");
}
if (!supabaseAnonKey) {
    throw new Error("Supabase anon key is not defined. Add VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to your env.");
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 5
        }
    }
});
