import { supabase } from "@lib/supabaseClient";
import { z } from "zod";
const sessionStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    track_name: z.string(),
    laps_target: z.number().nullable(),
    status: z.string().optional(),
    phase: z.string(),
    track_status: z.string(),
    race_time_ms: z.number(),
    is_timing: z.boolean().optional(),
    is_paused: z.boolean().optional(),
    race_started_at: z.string().nullable().optional(),
    pause_started_at: z.string().nullable().optional(),
    accumulated_pause_ms: z.number().nullable().optional(),
    session_id: z.string().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    ended_at: z.string().nullable().optional(),
    archived_at: z.string().nullable().optional()
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
const linkedDriverSchema = z
    .object({
    id: z.string(),
    name: z.string(),
    number: z.number().nullable()
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
const controlEventSchema = z.object({
    id: z.string(),
    session_id: z.string(),
    type: z.string(),
    payload: z.record(z.any()),
    created_at: z.string(),
    created_by: z.string().nullable()
});
const sessionSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    track_name: z.string().nullable(),
    laps_target: z.number().nullable(),
    mode: z.string().nullable(),
    status: z.string(),
    starts_at: z.string().nullable(),
    created_at: z.string(),
    archived_at: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    session_state: z
        .object({
        session_id: z.string(),
        procedure_phase: z.string(),
        flag_status: z.string(),
        race_time_ms: z.number(),
        is_timing: z.boolean().optional(),
        is_paused: z.boolean().optional()
    })
        .nullable()
});
const resultDriverSchema = z
    .object({
    id: z.string(),
    name: z.string(),
    number: z.number().nullable(),
    team_name: z.string().nullable()
})
    .nullable()
    .optional();
const timingResultSchema = z.object({
    id: z.string(),
    session_id: z.string(),
    driver_id: z.string(),
    position: z.number(),
    laps: z.number(),
    total_time_ms: z.number().nullable(),
    gap_ms: z.number().nullable(),
    gap_laps: z.number().nullable(),
    status: z.string(),
    driver: resultDriverSchema
});
const activeSessionSchema = z.object({
    id: z.string()
});
export const fetchSessionDetail = async (sessionId) => {
    const { data: sessionRow, error: sessionError } = await supabase
        .from("timing_sessions")
        .select("id, name, track_name, laps_target, status, starts_at, ends_at, ended_at, archived_at")
        .eq("id", sessionId)
        .single();
    if (sessionError)
        throw sessionError;
    const { data: stateRow, error: stateError } = await supabase
        .from("timing_session_state")
        .select("session_id, procedure_phase, flag_status, race_time_ms, is_timing, is_paused, race_started_at, pause_started_at, accumulated_pause_ms")
        .eq("session_id", sessionId)
        .single();
    if (stateError)
        throw stateError;
    return sessionStateSchema.parse({
        ...sessionRow,
        ...stateRow,
        id: sessionRow.id,
        phase: stateRow.procedure_phase,
        track_status: stateRow.flag_status
    });
};
export const fetchSessions = async () => {
    const { data, error } = await supabase
        .from("timing_sessions")
        .select(`
        id,
        name,
        track_name,
        laps_target,
        mode,
        status,
        starts_at,
        created_at,
        archived_at,
        is_active,
        session_state:timing_session_state(session_id, procedure_phase, flag_status, race_time_ms, is_timing, is_paused)
      `)
        .order("created_at", { ascending: false });
    if (error)
        throw error;
    return z.array(sessionSummarySchema).parse(data ?? []);
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
    const { error } = await supabase.rpc("timing_log_lap_auto", {
        p_driver_id: payload.driverId
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
        .select("id, session_id, driver_id, reason, seconds, issued_at, driver:timing_drivers(id, name, number)")
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
        .select("id, session_id, driver_id, duration_ms, started_at, driver:timing_drivers(id, name, number)")
        .eq("session_id", sessionId)
        .order("started_at", { ascending: false })
        .limit(20);
    if (error)
        throw error;
    return z.array(pitEventLogSchema).parse(data ?? []);
};
export const fetchControlEvents = async (sessionId) => {
    const { data, error } = await supabase
        .from("race_control_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(50);
    if (error)
        throw error;
    return z.array(controlEventSchema).parse(data ?? []);
};
export const fetchTimingResults = async (sessionId) => {
    const { data, error } = await supabase
        .from("timing_results")
        .select("id, session_id, driver_id, position, laps, total_time_ms, gap_ms, gap_laps, status, driver:timing_drivers(id, name, number, team_name)")
        .eq("session_id", sessionId)
        .order("position", { ascending: true });
    if (error)
        throw error;
    return z.array(timingResultSchema).parse(data ?? []);
};
export const setFlagStatus = async (sessionId, flag) => {
    const { error } = await supabase.rpc("timing_set_flag_status", {
        p_session_id: sessionId,
        p_flag: flag
    });
    if (error)
        throw error;
};
export const pauseRace = async (sessionId) => {
    const { error } = await supabase.rpc("timing_pause_race", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
};
export const resumeRace = async (sessionId) => {
    const { error } = await supabase.rpc("timing_resume_race", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
};
export const updateDriverStatus = async (driverId, status, reason) => {
    const { error } = await supabase.rpc("timing_update_driver_status", {
        p_driver_id: driverId,
        p_status: status,
        p_reason: reason ?? null
    });
    if (error)
        throw error;
};
export const logControlError = async (sessionId, message) => {
    try {
        const { error } = await supabase.rpc("timing_log_control_error", {
            p_session_id: sessionId,
            p_message: message
        });
        if (error)
            throw error;
    }
    catch {
        // swallow logging errors to avoid loops
    }
};
export const getRaceTime = async (sessionId) => {
    const { data, error } = await supabase.rpc("timing_get_race_time", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
    return Number(data ?? 0);
};
export const finishSession = async (sessionId) => {
    const { error } = await supabase.rpc("timing_finish_session", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
    return fetchTimingResults(sessionId);
};
export const forceEndSession = async (payload) => {
    const { error } = await supabase.rpc("timing_force_end_session", {
        p_session_id: payload.sessionId,
        p_status: payload.status ?? null,
        p_reason: payload.reason ?? null
    });
    if (error)
        throw error;
};
export const archiveSession = async (sessionId) => {
    const { error } = await supabase.rpc("timing_archive_session", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
};
export const restoreSession = async (sessionId) => {
    const { error } = await supabase.rpc("timing_restore_session", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
};
export const setActiveSession = async (sessionId) => {
    const { error } = await supabase.rpc("set_active_session", {
        p_session_id: sessionId
    });
    if (error)
        throw error;
};
export const fetchActiveTimingSession = async () => {
    const { data, error } = await supabase
        .from("timing_sessions")
        .select("id")
        .eq("is_active", true)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error && error.code !== "PGRST116")
        throw error;
    if (!data)
        return null;
    return activeSessionSchema.parse(data);
};
