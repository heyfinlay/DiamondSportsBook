import type { DriverStanding } from "@domains/timing/api/timingApi";
export interface LeaderboardRow extends DriverStanding {
    displayGap: string;
    displayLastLap: string;
    displayBestLap: string;
}
export declare const formatLapTime: (ms?: number | null, fallback?: string) => string;
export declare const buildLeaderboard: (drivers: DriverStanding[], sessionMode?: string) => LeaderboardRow[];
