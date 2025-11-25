export const walletKeys = {
    balance: (userId) => ["wallet-balance", userId ?? null],
    transactions: (userId) => ["wallet-transactions", userId ?? null]
};
export const marketKeys = {
    pools: () => ["markets:v2-pools"],
    pool: (marketId) => ["markets:v2-pool", marketId ?? null],
    liveBets: (marketId) => ["markets:v2-live-bets", marketId ?? null]
};
export const timingKeys = {
    session: (sessionId) => ["live-session", sessionId ?? null],
    standings: (sessionId) => ["live-standings", sessionId ?? null],
    penalties: (sessionId) => ["live-penalties", sessionId ?? null],
    pitEvents: (sessionId) => ["live-pit-events", sessionId ?? null],
    results: (sessionId) => ["live-results", sessionId ?? null]
};
export const standingsKeys = {
    drivers: (seasonId) => ["standings:drivers", seasonId ?? null],
    teams: (seasonId) => ["standings:teams", seasonId ?? null],
    raceResults: (seasonId) => ["standings:race-results", seasonId ?? null]
};
