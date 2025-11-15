import { z } from "zod";
export declare const timingSessionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    phase: z.ZodString;
    race_time_ms: z.ZodNumber;
    track_status: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    phase?: string;
    race_time_ms?: number;
    track_status?: string;
}, {
    id?: string;
    name?: string;
    phase?: string;
    race_time_ms?: number;
    track_status?: string;
}>;
export type TimingSession = z.infer<typeof timingSessionSchema>;
export declare const fetchLiveSession: (sessionId: string) => Promise<{
    id?: string;
    name?: string;
    phase?: string;
    race_time_ms?: number;
    track_status?: string;
}>;
