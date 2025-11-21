import type { Outcome } from "../types";

export interface OutcomeRankings {
  favouriteId: string | null;
  bestPayoutId: string | null;
}

export const getOutcomeRankings = (outcomes: Outcome[]): OutcomeRankings => {
  if (!outcomes.length) {
    return { favouriteId: null, bestPayoutId: null };
  }

  let favourite = outcomes[0];
  let bestPayout = outcomes[0];

  for (let index = 1; index < outcomes.length; index += 1) {
    const current = outcomes[index];
    if (current.baselineOdds < favourite.baselineOdds) {
      favourite = current;
    }
    if (current.baselineOdds > bestPayout.baselineOdds) {
      bestPayout = current;
    }
  }

  return {
    favouriteId: favourite?.id ?? null,
    bestPayoutId: bestPayout?.id ?? null
  };
};
