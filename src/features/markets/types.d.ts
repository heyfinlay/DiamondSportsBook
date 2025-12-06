export type PoolStatus = "open" | "closing_soon" | "closed" | "settled";
export interface Outcome {
    id: string;
    teamName: string;
    driverName: string;
    teamColor?: string;
    teamCode?: string;
    marketShare: number;
    baselineOdds: number;
    numBets: number;
    diamondsStaked: number;
    trendDelta: number;
}
export interface Pool {
    id: string;
    title: string;
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
    teamName: string;
    driverName?: string;
    teamColor?: string;
    amount: number;
    placedAt: string;
    oddsAtPlacement: number;
}
