import { z } from "zod";
declare const sessionStateSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    track_name: z.ZodString;
    laps_target: z.ZodNullable<z.ZodNumber>;
    phase: z.ZodString;
    track_status: z.ZodString;
    race_time_ms: z.ZodNumber;
    session_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    id?: string;
    track_name?: string;
    laps_target?: number;
    phase?: string;
    track_status?: string;
    race_time_ms?: number;
    session_id?: string;
}, {
    name?: string;
    id?: string;
    track_name?: string;
    laps_target?: number;
    phase?: string;
    track_status?: string;
    race_time_ms?: number;
    session_id?: string;
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
declare const raceEventSchema: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    kind: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodAny>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    session_id?: string;
    kind?: string;
    payload?: Record<string, any>;
    created_at?: string;
}, {
    id?: string;
    session_id?: string;
    kind?: string;
    payload?: Record<string, any>;
    created_at?: string;
}>;
export type RaceEvent = z.infer<typeof raceEventSchema>;
export declare const fetchSessionDetail: (sessionId: string) => Promise<{
    name?: string;
    id?: string;
    track_name?: string;
    laps_target?: number;
    phase?: string;
    track_status?: string;
    race_time_ms?: number;
    session_id?: string;
}>;
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
export declare const fetchRaceEvents: (sessionId: string) => Promise<{
    id?: string;
    session_id?: string;
    kind?: string;
    payload?: Record<string, any>;
    created_at?: string;
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
    lapNumber: number;
    lapMs: number;
}
export declare const logLap: (payload: LogLapPayload) => Promise<void>;
export {};
