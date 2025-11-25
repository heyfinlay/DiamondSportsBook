export declare const walletKeys: {
    balance: (userId?: string | null) => readonly ["wallet-balance", string];
    transactions: (userId?: string | null) => readonly ["wallet-transactions", string];
};
export declare const marketKeys: {
    pools: () => readonly ["markets:v2-pools"];
    pool: (marketId?: string | null) => readonly ["markets:v2-pool", string];
    liveBets: (marketId?: string | null) => readonly ["markets:v2-live-bets", string];
};
export declare const timingKeys: {
    session: (sessionId?: string | null) => readonly ["live-session", string];
    standings: (sessionId?: string | null) => readonly ["live-standings", string];
    penalties: (sessionId?: string | null) => readonly ["live-penalties", string];
    pitEvents: (sessionId?: string | null) => readonly ["live-pit-events", string];
    results: (sessionId?: string | null) => readonly ["live-results", string];
};
export declare const standingsKeys: {
    drivers: (seasonId?: string | null) => readonly ["standings:drivers", string];
    teams: (seasonId?: string | null) => readonly ["standings:teams", string];
    raceResults: (seasonId?: string | null) => readonly ["standings:race-results", string];
};
