import { describe, expect, it } from "vitest";
import { findDriverByNumberHotkey } from "./driverHotkeys";
let driverCounter = 0;
const buildDriver = (overrides) => ({
    driver_id: overrides.driver_id ?? `driver-${driverCounter++}`,
    driver_name: overrides.driver_name ?? "Driver",
    team_name: overrides.team_name ?? "Team",
    car_number: overrides.car_number ?? 0,
    laps_completed: overrides.laps_completed ?? 0,
    last_lap_ms: overrides.last_lap_ms ?? null,
    best_lap_ms: overrides.best_lap_ms ?? null,
    total_time_ms: overrides.total_time_ms ?? null,
    status: overrides.status ?? "running",
    position: overrides.position ?? null,
    gap_to_leader_ms: overrides.gap_to_leader_ms ?? null
});
describe("findDriverByNumberHotkey", () => {
    const driverSeven = buildDriver({ driver_id: "driver-7", car_number: 7, driver_name: "Driver Seven" });
    const driverFive = buildDriver({ driver_id: "driver-5", car_number: 5, driver_name: "Driver Five" });
    const driverThree = buildDriver({ driver_id: "driver-3", car_number: 3, driver_name: "Driver Three" });
    it("targets the driver with the matching number regardless of ordering", () => {
        const ordered = [driverThree, driverFive, driverSeven];
        const reordered = [driverSeven, driverThree, driverFive];
        expect(findDriverByNumberHotkey(ordered, "7")?.driver_id).toBe("driver-7");
        expect(findDriverByNumberHotkey(reordered, "7")?.driver_id).toBe("driver-7");
    });
    it("ignores non-numeric inputs", () => {
        const drivers = [driverThree, driverFive, driverSeven];
        expect(findDriverByNumberHotkey(drivers, "q")).toBeUndefined();
        expect(findDriverByNumberHotkey(drivers, "ArrowUp")).toBeUndefined();
    });
    it("returns undefined when no driver matches the key", () => {
        const drivers = [driverThree, driverFive];
        expect(findDriverByNumberHotkey(drivers, "7")).toBeUndefined();
    });
});
