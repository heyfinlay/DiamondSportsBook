import type { DriverStanding } from "@domains/timing/api/timingApi";
/**
 * Match a keyboard key to a driver via their stable car/driver number.
 */
export declare const findDriverByNumberHotkey: (drivers: DriverStanding[], key: string) => {
    position?: number;
    status?: string;
    driver_id?: string;
    team_name?: string;
    driver_name?: string;
    car_number?: number;
    laps_completed?: number;
    last_lap_ms?: number;
    best_lap_ms?: number;
    total_time_ms?: number;
    display_position?: number;
    gap_to_leader_ms?: number;
};
