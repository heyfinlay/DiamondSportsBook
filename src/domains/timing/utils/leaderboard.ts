import type { DriverStanding } from "@domains/timing/api/timingApi";

export interface LeaderboardRow extends DriverStanding {
  displayGap: string;
  displayLastLap: string;
  displayBestLap: string;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const formatLapTime = (ms?: number | null, fallback = "—") => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) {
    return fallback;
  }
  const totalMs = Number(ms);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return fallback;
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = Math.floor(totalMs % 1000);
  const minutePrefix = minutes > 0 ? `${minutes}:` : "";
  const secondsStr = minutes > 0 ? seconds.toString().padStart(2, "0") : seconds.toString();
  return `${minutePrefix}${secondsStr}.${milliseconds.toString().padStart(3, "0")}`;
};

const formatGapSeconds = (ms: number) => {
  if (ms <= 0) return "+0.000";
  if (ms >= 60000) {
    return `+${formatLapTime(ms)}`;
  }
  return `+${(ms / 1000).toFixed(3)}`;
};

const compareDrivers = (a: DriverStanding, b: DriverStanding) => {
  const lapsA = a.laps_completed ?? 0;
  const lapsB = b.laps_completed ?? 0;
  if (lapsA !== lapsB) return lapsB - lapsA;
  const timeA = isFiniteNumber(a.total_time_ms) ? a.total_time_ms : Number.MAX_SAFE_INTEGER;
  const timeB = isFiniteNumber(b.total_time_ms) ? b.total_time_ms : Number.MAX_SAFE_INTEGER;
  if (timeA !== timeB) return timeA - timeB;
  return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER);
};

const getGapMs = (driver: DriverStanding, leader: DriverStanding) => {
  const driverTotal = isFiniteNumber(driver.total_time_ms) ? driver.total_time_ms : null;
  const leaderTotal = isFiniteNumber(leader.total_time_ms) ? leader.total_time_ms : null;
  if (driverTotal !== null && leaderTotal !== null) {
    return Math.max(0, driverTotal - leaderTotal);
  }
  if (isFiniteNumber(driver.gap_to_leader_ms)) return Math.max(0, driver.gap_to_leader_ms);
  return null;
};

const formatLapDeficit = (lapDiff: number, gapMs: number | null) => {
  const base = `+${lapDiff}L`;
  if (!gapMs || gapMs <= 0) return base;
  return `${base} ${formatGapSeconds(gapMs)}`;
};

const sortByDisplayPosition = (a: DriverStanding, b: DriverStanding) => {
  const aPos = a.display_position ?? Number.MAX_SAFE_INTEGER;
  const bPos = b.display_position ?? Number.MAX_SAFE_INTEGER;
  if (aPos !== bPos) return aPos - bPos;
  return compareDrivers(a, b);
};

export const buildLeaderboard = (drivers: DriverStanding[], sessionMode?: string): LeaderboardRow[] => {
  if (!drivers.length) return [];

  const useDisplayOrder =
    sessionMode === "race" &&
    drivers.some((driver) => driver.display_position !== null && driver.display_position !== undefined);

  const sorted = [...drivers]
    .map((driver) => ({
      ...driver,
      laps_completed: driver.laps_completed ?? 0,
      total_time_ms: isFiniteNumber(driver.total_time_ms) ? driver.total_time_ms : null,
      best_lap_ms: isFiniteNumber(driver.best_lap_ms) ? driver.best_lap_ms : null,
      last_lap_ms: isFiniteNumber(driver.last_lap_ms) ? driver.last_lap_ms : null
    }))
    .sort(useDisplayOrder ? sortByDisplayPosition : compareDrivers);

  const leader = sorted[0];
  const leaderLaps = leader?.laps_completed ?? 0;

  return sorted.map((driver, index) => {
    const displayLastLap = formatLapTime(driver.last_lap_ms);
    const displayBestLap = formatLapTime(driver.best_lap_ms);
    const driverLaps = driver.laps_completed ?? 0;
    let displayGap = "Leader";

    if (index > 0 && leader) {
      const lapDeficit = leaderLaps - driverLaps;
      if (lapDeficit > 0) {
        const gapMs = getGapMs(driver, leader);
        displayGap = formatLapDeficit(lapDeficit, gapMs);
      } else if (lapDeficit === 0) {
        const gapMs = getGapMs(driver, leader);
        displayGap = gapMs !== null ? formatGapSeconds(gapMs) : "+0.000";
      } else {
        displayGap = "+0.000";
      }
    }

    if (index > 0 && leader && driverLaps === 0) {
      displayGap = "+0L";
    }

    return {
      ...driver,
      position: index + 1,
      displayGap,
      displayLastLap,
      displayBestLap
    };
  });
};
