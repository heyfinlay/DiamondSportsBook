import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
export const useTimingStore = create()(devtools(subscribeWithSelector((set) => ({
    raceTimeMs: 0,
    phase: "setup",
    trackStatus: "green",
    drivers: [],
    lapsFeed: [],
    setSessionMeta: ({ sessionId, phase, raceTimeMs }) => set({ sessionId, phase, raceTimeMs }),
    setTrackStatus: (trackStatus) => set({ trackStatus }),
    upsertDrivers: (drivers) => set({ drivers }),
    pushLapEvent: (event) => set((state) => ({ lapsFeed: [event, ...state.lapsFeed].slice(0, 50) }))
})), { name: "timing-store" }));
