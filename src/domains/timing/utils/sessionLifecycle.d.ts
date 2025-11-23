import type { SessionState } from "@domains/timing/api/timingApi";
export declare const sessionHasEnded: (session?: Pick<SessionState, "status" | "phase" | "ended_at"> | null) => boolean;
