export type PoolStatus = "open" | "closing_soon" | "closed" | "settled";
export interface Outcome {
    id: string;
    label: string;
    primaryLabel: string;
    secondaryLabel?: string;
    accentColor?: string;
    shortLabel?: string;
    participantType?: string;
    marketShare: number;
    baselineOdds: number;
    numBets: number;
    diamondsStaked: number;
    trendDelta: number;
}
export interface Pool {
    id: string;
    title: string;
    eventTitle?: string | null;
    categoryLabel?: string | null;
    sportCode?: string | null;
    status: PoolStatus;
    totalStake: number;
    totalBets: number;
    closeAt?: string | null;
    timeRemainingLabel: string;
    rakePercent: number;
    lastUpdatedLabel: string;
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
    placedAt: string;
    oddsAtPlacement: number;
}
