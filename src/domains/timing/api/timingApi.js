import { supabase } from "@lib/supabaseClient";
import { z } from "zod";
const sessionStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    track_name: z.string(),
    laps_target: z.number().nullable(),
    phase: z.string(),
    track_status: z.string(),
    race_time_ms: z.number(),
    session_id: z.string().optional()
});
const driverStandingSchema = z.object({
    driver_id: z.string(),
    driver_name: z.string(),
    team_name: z.string(),
    car_number: z.number(),
    laps_completed: z.number(),
    last_lap_ms: z.number().nullable(),
    best_lap_ms: z.number().nullable(),
    total_time_ms: z.number().nullable(),
    status: z.string(),
    position: z.number().nullable(),
    gap_to_leader_ms: z.number().nullable()
});
const raceEventSchema = z.object({
    id: z.string(),
    session_id: z.string(),
    kind: z.string(),
    payload: z.record(z.any()),
    created_at: z.string()
});
const linkedDriverSchema = z
    .object({
    id: z.string(),
    display_name: z.string(),
    car_number: z.number().nullable()
})
    .nullable()
    .optional();
const penaltySchema = z.object({
    id: z.string(),
    session_id: z.string(),
    driver_id: z.string().nullable(),
    reason: z.string(),
    seconds: z.number(),
    issued_at: z.string(),
    driver: linkedDriverSchema
});
const pitEventLogSchema = z.object({
    id: z.string(),
    session_id: z.string(),
    driver_id: z.string(),
    duration_ms: z.number().nullable(),
    started_at: z.string(),
    driver: linkedDriverSchema
});
export const fetchSessionDetail = async (sessionId) => {
    const { data: sessionRow, error: sessionError } = await supabase
        .from("sessions")
        .select("id, name, track_name, laps_target")
        .eq("id", sessionId)
        .single();
    if (sessionError)
        throw sessionError;
    const { data: stateRow, error: stateError } = await supabase
        .from("session_state")
        .select("session_id, phase, track_status, race_time_ms")
        .eq("session_id", sessionId)
        .single();
    if (stateError)
        throw stateError;
    return sessionStateSchema.parse({
        ...sessionRow,
        ...stateRow,
        id: sessionRow.id
    });
};
export const fetchDriverStandings = async (sessionId) => {
    const { data, error } = await supabase
        .from("live_driver_gaps")
        .select("*")
        .eq("session_id", sessionId)
        .order("position", { ascending: true });
    if (error)
        throw error;
    return z.array(driverStandingSchema).parse(data ?? []);
};
export const fetchRaceEvents = async (sessionId) => {
    const { data, error } = await supabase
        .from("race_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(50);
    if (error)
        throw error;
    return z.array(raceEventSchema).parse(data ?? []);
};
export const createSession = async (payload) => {
    const { data, error } = await supabase.rpc("timing_create_session", {
        p_name: payload.name,
        p_track_name: payload.trackName,
        p_laps_target: payload.lapsTarget ?? null,
        p_drivers: payload.drivers
    });
    if (error)
        throw error;
    if (!data)
        throw new Error("Session creation failed");
    return data;
};
export const initializeRace = async (sessionId) => {
    const { error } = await supabase.rpc("timing_initialize_race", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
};
export const logLap = async (payload) => {
    const { error } = await supabase.rpc("timing_log_lap", {
        p_driver_id: payload.driverId,
        p_lap_number: payload.lapNumber,
        p_lap_ms: payload.lapMs
    });
    if (error)
        throw error;
};
export const invalidateLastLap = async (driverId) => {
    const { error } = await supabase.rpc("timing_invalidate_last_lap", {
        p_driver_id: driverId
    });
    if (error)
        throw error;
};
export const logPenalty = async (payload) => {
    const { error } = await supabase.rpc("timing_log_penalty", {
        p_session_id: payload.sessionId,
        p_driver_id: payload.driverId ?? null,
        p_reason: payload.reason,
        p_seconds: payload.seconds
    });
    if (error)
        throw error;
};
export const logPitEvent = async (payload) => {
    const { error } = await supabase.rpc("timing_log_pit_event", {
        p_driver_id: payload.driverId,
        p_duration_ms: payload.durationMs ?? null
    });
    if (error)
        throw error;
};
export const deleteSessionDeep = async (sessionId) => {
    const { error } = await supabase.rpc("timing_delete_session_deep", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
};
export const fetchPenalties = async (sessionId) => {
    const { data, error } = await supabase
        .from("penalties")
        .select("id, session_id, driver_id, reason, seconds, issued_at, driver:drivers(id, display_name, car_number)")
        .eq("session_id", sessionId)
        .order("issued_at", { ascending: false })
        .limit(20);
    if (error)
        throw error;
    return z.array(penaltySchema).parse(data ?? []);
};
export const fetchPitEvents = async (sessionId) => {
    const { data, error } = await supabase
        .from("pit_events")
        .select("id, session_id, driver_id, duration_ms, started_at, driver:drivers(id, display_name, car_number)")
        .eq("session_id", sessionId)
        .order("started_at", { ascending: false })
        .limit(20);
    if (error)
        throw error;
    return z.array(pitEventLogSchema).parse(data ?? []);
};
