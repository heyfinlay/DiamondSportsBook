import type { Outcome } from "../types";
export interface OutcomeRankings {
    favouriteId: string | null;
    bestPayoutId: string | null;
}
export declare const getOutcomeRankings: (outcomes: Outcome[]) => OutcomeRankings;
