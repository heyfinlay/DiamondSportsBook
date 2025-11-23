import type { SessionState } from "@domains/timing/api/timingApi";

const ENDED_STATUSES = new Set(["finished", "completed", "aborted"]);

export const sessionHasEnded = (session?: Pick<SessionState, "status" | "phase" | "ended_at"> | null) => {
  if (!session) return false;
  if (session.ended_at) return true;
  if (session.phase === "finished") return true;
  if (!session.status) return false;
  return ENDED_STATUSES.has(session.status);
};
