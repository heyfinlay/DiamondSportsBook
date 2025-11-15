import { useEffect } from "react";
import { supabase } from "@lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
export const useTimingRealtime = (sessionId) => {
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!sessionId)
            return;
        const channel = supabase
            .channel(`timing-${sessionId}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "session_state", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["live-session", sessionId] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "drivers", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["live-standings", sessionId] });
        })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "laps", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["live-standings", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["timing-events", sessionId] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "race_events", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-events", sessionId] });
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, sessionId]);
};
