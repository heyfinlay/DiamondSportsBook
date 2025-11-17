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
            .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "timing_session_state",
            filter: `session_id=eq.${sessionId}`
        }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["live-session", sessionId] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "timing_drivers", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["live-standings", sessionId] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "timing_laps", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["live-standings", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["timing-events", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "timing_events", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["timing-events", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "penalties", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["live-penalties", sessionId] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "pit_events", filter: `session_id=eq.${sessionId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["live-pit-events", sessionId] });
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, sessionId]);
};
