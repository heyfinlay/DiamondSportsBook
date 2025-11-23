import { describe, expect, it } from "vitest";

import type { SessionState } from "@domains/timing/api/timingApi";
import { sessionHasEnded } from "./sessionLifecycle";

const buildSession = (overrides: Partial<SessionState>): SessionState => ({
  id: overrides.id ?? "session",
  name: overrides.name ?? "Test Session",
  track_name: overrides.track_name ?? "Track",
  laps_target: overrides.laps_target ?? null,
  status: overrides.status ?? "active",
  phase: overrides.phase ?? "race",
  track_status: overrides.track_status ?? "green",
  race_time_ms: overrides.race_time_ms ?? 0,
  is_timing: overrides.is_timing ?? true,
  is_paused: overrides.is_paused ?? false,
  race_started_at: overrides.race_started_at ?? null,
  pause_started_at: overrides.pause_started_at ?? null,
  accumulated_pause_ms: overrides.accumulated_pause_ms ?? null,
  session_id: overrides.session_id ?? undefined,
  starts_at: overrides.starts_at ?? null,
  ends_at: overrides.ends_at ?? null,
  ended_at: overrides.ended_at ?? null,
  archived_at: overrides.archived_at ?? null
});

describe("sessionHasEnded", () => {
  it("returns false for active races", () => {
    expect(sessionHasEnded(buildSession({ status: "active", phase: "race" }))).toBe(false);
  });

  it("returns true when phase is finished regardless of status", () => {
    expect(sessionHasEnded(buildSession({ status: "active", phase: "finished" }))).toBe(true);
  });

  it("returns true for terminal statuses", () => {
    expect(sessionHasEnded(buildSession({ status: "finished" }))).toBe(true);
    expect(sessionHasEnded(buildSession({ status: "completed" }))).toBe(true);
    expect(sessionHasEnded(buildSession({ status: "aborted" }))).toBe(true);
  });

  it("treats ended_at as authoritative", () => {
    expect(sessionHasEnded(buildSession({ status: "active", ended_at: new Date().toISOString() }))).toBe(true);
  });

  it("handles undefined input", () => {
    expect(sessionHasEnded(undefined)).toBe(false);
  });
});
