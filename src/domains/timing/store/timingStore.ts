import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

export interface DriverTiming {
  id: string;
  name: string;
  team: string;
  carNumber: number;
  laps: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
  gapToLeaderMs: number | null;
  status: "running" | "pit" | "dnf";
}

interface TimingState {
  sessionId?: string;
  raceTimeMs: number;
  phase: string;
  trackStatus: string;
  drivers: DriverTiming[];
  lapsFeed: Array<{ id: string; driverId: string; lapNumber: number; lapMs: number }>;
  setSessionMeta: (payload: { sessionId: string; phase: string; raceTimeMs: number }) => void;
  setTrackStatus: (status: string) => void;
  upsertDrivers: (drivers: DriverTiming[]) => void;
  pushLapEvent: (event: TimingState["lapsFeed"][number]) => void;
}

export const useTimingStore = create<TimingState>()(
  devtools(
    subscribeWithSelector((set) => ({
      raceTimeMs: 0,
      phase: "setup",
      trackStatus: "green",
      drivers: [],
      lapsFeed: [],
      setSessionMeta: ({ sessionId, phase, raceTimeMs }) =>
        set({ sessionId, phase, raceTimeMs }),
      setTrackStatus: (trackStatus) => set({ trackStatus }),
      upsertDrivers: (drivers) => set({ drivers }),
      pushLapEvent: (event) =>
        set((state) => ({ lapsFeed: [event, ...state.lapsFeed].slice(0, 50) }))
    })),
    { name: "timing-store" }
  )
);
