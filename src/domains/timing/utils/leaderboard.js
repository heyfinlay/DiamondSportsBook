export const formatLapTime = (ms, fallback = "—") => {
    if (ms === null || ms === undefined || Number.isNaN(ms)) {
        return fallback;
    }
    const totalMs = Number(ms);
    if (!Number.isFinite(totalMs) || totalMs <= 0)
        return fallback;
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = Math.floor(totalMs % 1000);
    const minutePrefix = minutes > 0 ? `${minutes}:` : "";
    const secondsStr = minutes > 0 ? seconds.toString().padStart(2, "0") : seconds.toString();
    return `${minutePrefix}${secondsStr}.${milliseconds.toString().padStart(3, "0")}`;
};
const formatGap = (ms) => {
    if (!ms || ms <= 0)
        return "Leader";
    return `+${formatLapTime(ms)}`;
};
export const buildLeaderboard = (drivers) => {
    return drivers
        .map((driver, index) => ({
        ...driver,
        position: driver.position ?? index + 1,
        displayGap: formatGap(driver.gap_to_leader_ms),
        displayLastLap: formatLapTime(driver.last_lap_ms),
        displayBestLap: formatLapTime(driver.best_lap_ms)
    }))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
};
