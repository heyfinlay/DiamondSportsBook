export type PoolStatus = "open" | "closing_soon" | "closed" | "settled";

export interface Outcome {
  id: string;
  teamName: string;
  driverName: string;
  teamColor?: string;
  teamCode?: string;
  driverNumber?: string | number | null;
  marketShare: number; // 0–1
  baselineOdds: number; // e.g. 3.6 => x3.6
  numBets: number;
  diamondsStaked: number; // raw diamonds, e.g. 1840000
  trendDelta: number; // positive/negative change over recent window
}

export interface Pool {
  id: string;
  title: string; // e.g. "Race 1 · Overall Winner"
  status: PoolStatus;
  totalStake: number;
  totalBets: number;
  timeRemainingLabel: string; // "Closes in 08:12", "Closed · 2m ago"
  rakePercent: number;
  lastUpdatedLabel: string; // "00:34 ago"
  outcomes: Outcome[];
}

export interface LiveBet {
  id: string;
  poolId: string;
  outcomeId: string;
  teamName: string;
  driverName?: string;
  teamColor?: string;
  amount: number;
  placedAt: string; // ISO timestamp
  oddsAtPlacement: number;
}
