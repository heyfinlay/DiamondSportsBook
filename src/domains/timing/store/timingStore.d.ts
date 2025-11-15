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
    lapsFeed: Array<{
        id: string;
        driverId: string;
        lapNumber: number;
        lapMs: number;
    }>;
    setSessionMeta: (payload: {
        sessionId: string;
        phase: string;
        raceTimeMs: number;
    }) => void;
    setTrackStatus: (status: string) => void;
    upsertDrivers: (drivers: DriverTiming[]) => void;
    pushLapEvent: (event: TimingState["lapsFeed"][number]) => void;
}
export declare const useTimingStore: import("zustand").UseBoundStore<Omit<Omit<import("zustand").StoreApi<TimingState>, "setState"> & {
    setState<A extends string | {
        type: string;
    }>(partial: TimingState | Partial<TimingState> | ((state: TimingState) => TimingState | Partial<TimingState>), replace?: boolean, action?: A): void;
}, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: TimingState, previousSelectedState: TimingState) => void): () => void;
        <U>(selector: (state: TimingState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }): () => void;
    };
}>;
export {};
