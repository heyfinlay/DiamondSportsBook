import { supabase } from "@lib/supabaseClient";
import { z } from "zod";

export const timingSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: z.string(),
  race_time_ms: z.number(),
  track_status: z.string()
});

export type TimingSession = z.infer<typeof timingSessionSchema>;

export const fetchLiveSession = async (sessionId: string) => {
  const { data, error } = await supabase
    .from("session_state")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error) {
    throw error;
  }

  return timingSessionSchema.parse(data);
};
