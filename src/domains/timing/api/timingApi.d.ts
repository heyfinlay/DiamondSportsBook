import { z } from "zod";
declare const sessionStateSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    track_name: z.ZodString;
    laps_target: z.ZodNullable<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    phase: z.ZodString;
    track_status: z.ZodString;
    race_time_ms: z.ZodNumber;
    is_timing: z.ZodOptional<z.ZodBoolean>;
    is_paused: z.ZodOptional<z.ZodBoolean>;
    race_started_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pause_started_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    accumulated_pause_ms: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    session_id: z.ZodOptional<z.ZodString>;
    starts_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ends_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ended_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    archived_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    track_name?: string;
    laps_target?: number;
    status?: string;
    phase?: string;
    track_status?: string;
    race_time_ms?: number;
    is_timing?: boolean;
    is_paused?: boolean;
    race_started_at?: string;
    pause_started_at?: string;
    accumulated_pause_ms?: number;
    session_id?: string;
    starts_at?: string;
    ends_at?: string;
    ended_at?: string;
    archived_at?: string;
}, {
    id?: string;
    name?: string;
    track_name?: string;
    laps_target?: number;
    status?: string;
    phase?: string;
    track_status?: string;
    race_time_ms?: number;
    is_timing?: boolean;
    is_paused?: boolean;
    race_started_at?: string;
    pause_started_at?: string;
    accumulated_pause_ms?: number;
    session_id?: string;
    starts_at?: string;
    ends_at?: string;
    ended_at?: string;
    archived_at?: string;
}>;
export type SessionState = z.infer<typeof sessionStateSchema>;
declare const driverStandingSchema: z.ZodObject<{
    driver_id: z.ZodString;
    driver_name: z.ZodString;
    team_name: z.ZodString;
    car_number: z.ZodNumber;
    laps_completed: z.ZodNumber;
    last_lap_ms: z.ZodNullable<z.ZodNumber>;
    best_lap_ms: z.ZodNullable<z.ZodNumber>;
    total_time_ms: z.ZodNullable<z.ZodNumber>;
    status: z.ZodString;
    position: z.ZodNullable<z.ZodNumber>;
    gap_to_leader_ms: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    driver_id?: string;
    driver_name?: string;
    team_name?: string;
    car_number?: number;
    laps_completed?: number;
    last_lap_ms?: number;
    best_lap_ms?: number;
    total_time_ms?: number;
    position?: number;
    gap_to_leader_ms?: number;
}, {
    status?: string;
    driver_id?: string;
    driver_name?: string;
    team_name?: string;
    car_number?: number;
    laps_completed?: number;
    last_lap_ms?: number;
    best_lap_ms?: number;
    total_time_ms?: number;
    position?: number;
    gap_to_leader_ms?: number;
}>;
export type DriverStanding = z.infer<typeof driverStandingSchema>;
declare const penaltySchema: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    driver_id: z.ZodNullable<z.ZodString>;
    reason: z.ZodString;
    seconds: z.ZodNumber;
    issued_at: z.ZodString;
    driver: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        number: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        number?: number;
        id?: string;
        name?: string;
    }, {
        number?: number;
        id?: string;
        name?: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    session_id?: string;
    driver_id?: string;
    reason?: string;
    seconds?: number;
    issued_at?: string;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
    };
}, {
    id?: string;
    session_id?: string;
    driver_id?: string;
    reason?: string;
    seconds?: number;
    issued_at?: string;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
    };
}>;
export type PenaltyLog = z.infer<typeof penaltySchema>;
declare const pitEventLogSchema: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    driver_id: z.ZodString;
    duration_ms: z.ZodNullable<z.ZodNumber>;
    started_at: z.ZodString;
    driver: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        number: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        number?: number;
        id?: string;
        name?: string;
    }, {
        number?: number;
        id?: string;
        name?: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    session_id?: string;
    driver_id?: string;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
    };
    duration_ms?: number;
    started_at?: string;
}, {
    id?: string;
    session_id?: string;
    driver_id?: string;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
    };
    duration_ms?: number;
    started_at?: string;
}>;
export type PitEventLog = z.infer<typeof pitEventLogSchema>;
declare const controlEventSchema: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    type: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodAny>;
    created_at: z.ZodString;
    created_by: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    session_id?: string;
    type?: string;
    created_at?: string;
    payload?: Record<string, any>;
    created_by?: string;
}, {
    id?: string;
    session_id?: string;
    type?: string;
    created_at?: string;
    payload?: Record<string, any>;
    created_by?: string;
}>;
export type ControlEvent = z.infer<typeof controlEventSchema>;
declare const sessionSummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    track_name: z.ZodNullable<z.ZodString>;
    laps_target: z.ZodNullable<z.ZodNumber>;
    mode: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    starts_at: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    archived_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    session_state: z.ZodNullable<z.ZodObject<{
        session_id: z.ZodString;
        procedure_phase: z.ZodString;
        flag_status: z.ZodString;
        race_time_ms: z.ZodNumber;
        is_timing: z.ZodOptional<z.ZodBoolean>;
        is_paused: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        race_time_ms?: number;
        is_timing?: boolean;
        is_paused?: boolean;
        session_id?: string;
        procedure_phase?: string;
        flag_status?: string;
    }, {
        race_time_ms?: number;
        is_timing?: boolean;
        is_paused?: boolean;
        session_id?: string;
        procedure_phase?: string;
        flag_status?: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    track_name?: string;
    laps_target?: number;
    status?: string;
    starts_at?: string;
    archived_at?: string;
    mode?: string;
    created_at?: string;
    is_active?: boolean;
    session_state?: {
        race_time_ms?: number;
        is_timing?: boolean;
        is_paused?: boolean;
        session_id?: string;
        procedure_phase?: string;
        flag_status?: string;
    };
}, {
    id?: string;
    name?: string;
    track_name?: string;
    laps_target?: number;
    status?: string;
    starts_at?: string;
    archived_at?: string;
    mode?: string;
    created_at?: string;
    is_active?: boolean;
    session_state?: {
        race_time_ms?: number;
        is_timing?: boolean;
        is_paused?: boolean;
        session_id?: string;
        procedure_phase?: string;
        flag_status?: string;
    };
}>;
export type TimingSessionSummary = z.infer<typeof sessionSummarySchema>;
declare const timingResultSchema: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    driver_id: z.ZodString;
    position: z.ZodNumber;
    laps: z.ZodNumber;
    total_time_ms: z.ZodNullable<z.ZodNumber>;
    gap_ms: z.ZodNullable<z.ZodNumber>;
    gap_laps: z.ZodNullable<z.ZodNumber>;
    status: z.ZodString;
    driver: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        number: z.ZodNullable<z.ZodNumber>;
        team_name: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        number?: number;
        id?: string;
        name?: string;
        team_name?: string;
    }, {
        number?: number;
        id?: string;
        name?: string;
        team_name?: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    status?: string;
    session_id?: string;
    laps?: number;
    driver_id?: string;
    total_time_ms?: number;
    position?: number;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
        team_name?: string;
    };
    gap_ms?: number;
    gap_laps?: number;
}, {
    id?: string;
    status?: string;
    session_id?: string;
    laps?: number;
    driver_id?: string;
    total_time_ms?: number;
    position?: number;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
        team_name?: string;
    };
    gap_ms?: number;
    gap_laps?: number;
}>;
export type TimingResult = z.infer<typeof timingResultSchema>;
declare const activeSessionSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
}, {
    id?: string;
}>;
export type ActiveTimingSession = z.infer<typeof activeSessionSchema>;
export declare const fetchSessionDetail: (sessionId: string) => Promise<{
    id?: string;
    name?: string;
    track_name?: string;
    laps_target?: number;
    status?: string;
    phase?: string;
    track_status?: string;
    race_time_ms?: number;
    is_timing?: boolean;
    is_paused?: boolean;
    race_started_at?: string;
    pause_started_at?: string;
    accumulated_pause_ms?: number;
    session_id?: string;
    starts_at?: string;
    ends_at?: string;
    ended_at?: string;
    archived_at?: string;
}>;
export declare const fetchSessions: () => Promise<TimingSessionSummary[]>;
export declare const fetchDriverStandings: (sessionId: string) => Promise<{
    status?: string;
    driver_id?: string;
    driver_name?: string;
    team_name?: string;
    car_number?: number;
    laps_completed?: number;
    last_lap_ms?: number;
    best_lap_ms?: number;
    total_time_ms?: number;
    position?: number;
    gap_to_leader_ms?: number;
}[]>;
export interface CreateSessionPayload {
    name: string;
    trackName: string;
    lapsTarget?: number;
    drivers: Array<{
        display_name: string;
        team_name: string;
        car_number: number;
    }>;
}
export declare const createSession: (payload: CreateSessionPayload) => Promise<{
    id: string;
}>;
export declare const initializeRace: (sessionId: string) => Promise<void>;
export interface LogLapPayload {
    driverId: string;
}
export declare const logLap: (payload: LogLapPayload) => Promise<void>;
export declare const invalidateLastLap: (driverId: string) => Promise<void>;
export interface LogPenaltyPayload {
    sessionId: string;
    driverId?: string | null;
    reason: string;
    seconds: number;
}
export declare const logPenalty: (payload: LogPenaltyPayload) => Promise<void>;
export interface LogPitEventPayload {
    driverId: string;
    durationMs?: number | null;
}
export declare const logPitEvent: (payload: LogPitEventPayload) => Promise<void>;
export declare const deleteSessionDeep: (sessionId: string) => Promise<void>;
export declare const fetchPenalties: (sessionId: string) => Promise<{
    id?: string;
    session_id?: string;
    driver_id?: string;
    reason?: string;
    seconds?: number;
    issued_at?: string;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
    };
}[]>;
export declare const fetchPitEvents: (sessionId: string) => Promise<{
    id?: string;
    session_id?: string;
    driver_id?: string;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
    };
    duration_ms?: number;
    started_at?: string;
}[]>;
export declare const fetchControlEvents: (sessionId: string) => Promise<{
    id?: string;
    session_id?: string;
    type?: string;
    created_at?: string;
    payload?: Record<string, any>;
    created_by?: string;
}[]>;
export declare const fetchTimingResults: (sessionId: string) => Promise<{
    id?: string;
    status?: string;
    session_id?: string;
    laps?: number;
    driver_id?: string;
    total_time_ms?: number;
    position?: number;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
        team_name?: string;
    };
    gap_ms?: number;
    gap_laps?: number;
}[]>;
export declare const setFlagStatus: (sessionId: string, flag: string) => Promise<void>;
export declare const pauseRace: (sessionId: string) => Promise<void>;
export declare const resumeRace: (sessionId: string) => Promise<void>;
export declare const updateDriverStatus: (driverId: string, status: string, reason?: string) => Promise<void>;
export declare const logControlError: (sessionId: string, message: string) => Promise<void>;
export declare const getRaceTime: (sessionId: string) => Promise<number>;
export declare const finishSession: (sessionId: string) => Promise<{
    id?: string;
    status?: string;
    session_id?: string;
    laps?: number;
    driver_id?: string;
    total_time_ms?: number;
    position?: number;
    driver?: {
        number?: number;
        id?: string;
        name?: string;
        team_name?: string;
    };
    gap_ms?: number;
    gap_laps?: number;
}[]>;
export declare const forceEndSession: (payload: {
    sessionId: string;
    status?: "finished" | "aborted" | "completed";
    reason?: string;
}) => Promise<void>;
export declare const archiveSession: (sessionId: string) => Promise<void>;
export declare const restoreSession: (sessionId: string) => Promise<void>;
export declare const setActiveSession: (sessionId: string) => Promise<void>;
export declare const fetchActiveTimingSession: () => Promise<ActiveTimingSession | null>;
export {};
