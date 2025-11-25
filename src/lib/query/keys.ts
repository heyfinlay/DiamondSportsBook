export const walletKeys = {
  balance: (userId?: string | null) => ["wallet-balance", userId ?? null] as const,
  transactions: (userId?: string | null) => ["wallet-transactions", userId ?? null] as const
};

export const marketKeys = {
  pools: () => ["markets:v2-pools"] as const,
  pool: (marketId?: string | null) => ["markets:v2-pool", marketId ?? null] as const,
  liveBets: (marketId?: string | null) => ["markets:v2-live-bets", marketId ?? null] as const
};

export const timingKeys = {
  session: (sessionId?: string | null) => ["live-session", sessionId ?? null] as const,
  standings: (sessionId?: string | null) => ["live-standings", sessionId ?? null] as const,
  penalties: (sessionId?: string | null) => ["live-penalties", sessionId ?? null] as const,
  pitEvents: (sessionId?: string | null) => ["live-pit-events", sessionId ?? null] as const,
  results: (sessionId?: string | null) => ["live-results", sessionId ?? null] as const
};

export const standingsKeys = {
  drivers: (seasonId?: string | null) => ["standings:drivers", seasonId ?? null] as const,
  teams: (seasonId?: string | null) => ["standings:teams", seasonId ?? null] as const,
  raceResults: (seasonId?: string | null) => ["standings:race-results", seasonId ?? null] as const
};
