export type PoolStatus = "open" | "closing_soon" | "closed" | "settled";

export interface Outcome {
  id: string;
  label: string;
  primaryLabel: string;
  secondaryLabel?: string;
  accentColor?: string;
  shortLabel?: string;
  participantType?: string;
  marketShare: number; // 0–1
  baselineOdds: number; // e.g. 3.6 => x3.6
  numBets: number;
  diamondsStaked: number; // raw diamonds, e.g. 1840000
  trendDelta: number; // positive/negative change over recent window
}

export interface Pool {
  id: string;
  title: string; // e.g. "Race 1 · Overall Winner"
  eventTitle?: string | null;
  categoryLabel?: string | null;
  sportCode?: string | null;
  status: PoolStatus;
  totalStake: number;
  totalBets: number;
  closeAt?: string | null;
  timeRemainingLabel: string; // "Closes in 08:12", "Closed · 2m ago"
  rakePercent: number;
  lastUpdatedLabel: string; // "00:34 ago"
  outcomes: Outcome[];
}

export interface LiveBet {
  id: string;
  poolId: string;
  outcomeId: string;
  label: string;
  primaryLabel: string;
  secondaryLabel?: string;
  accentColor?: string;
  participantType?: string;
  amount: number;
  placedAt: string; // ISO timestamp
  oddsAtPlacement: number;
}
