import { useEffect } from "react";
import { subscribeToChannel } from "@lib/realtime";
import { supabase } from "@lib/supabaseClient";
import { useTimingStore } from "../store/timingStore";

export const useTimingRealtime = (sessionId?: string) => {
  const setSessionMeta = useTimingStore((state) => state.setSessionMeta);
  const upsertDrivers = useTimingStore((state) => state.upsertDrivers);
  const pushLapEvent = useTimingStore((state) => state.pushLapEvent);

  useEffect(() => {
    if (!sessionId) return;

    const channel = subscribeToChannel(
      `session-${sessionId}`,
      { config: { broadcast: { ack: true } } }
    )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_state", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const newRow = payload.new as any;
          setSessionMeta({
            sessionId,
            phase: newRow.phase,
            raceTimeMs: newRow.race_time_ms
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_driver_standings", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const rows = Array.isArray(payload.new) ? payload.new : [payload.new];
          upsertDrivers(
            rows.map((row: any) => ({
              id: row.driver_id,
              name: row.driver_name,
              team: row.team_name,
              carNumber: row.car_number,
              laps: row.laps_completed,
              lastLapMs: row.last_lap_ms,
              bestLapMs: row.best_lap_ms,
              gapToLeaderMs: row.gap_to_leader_ms,
              status: row.status
            }))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "laps", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          pushLapEvent({
            id: payload.new.id,
            driverId: payload.new.driver_id,
            lapNumber: payload.new.lap_number,
            lapMs: payload.new.lap_ms
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, setSessionMeta, upsertDrivers, pushLapEvent]);
};
