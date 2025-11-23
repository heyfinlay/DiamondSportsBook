import type { DriverStanding } from "@domains/timing/api/timingApi";
/**
 * Match a keyboard key to a driver via their stable car/driver number.
 */
export declare const findDriverByNumberHotkey: (drivers: DriverStanding[], key: string) => {
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
};
