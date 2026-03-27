import {
  fetchPoolPricing,
  fetchPoolsPricing,
  fetchRecentPoolBets
} from "@domains/betting/api/bettingApi";
import { mapPricingRowsToPool, mapPricingRowsToPools } from "./domain/adapter";
import { getTeamColor } from "./teamColors";
import type { LiveBet, Pool } from "./types";

export const fetchUiPools = async (): Promise<Pool[]> => {
  const rows = await fetchPoolsPricing();
  return mapPricingRowsToPools(rows);
};

export const fetchUiPoolById = async (poolId: string): Promise<Pool | null> => {
  const rows = await fetchPoolPricing(poolId);
  return mapPricingRowsToPool(rows);
};

export const fetchUiLiveBetsForPool = async (poolId: string): Promise<LiveBet[]> => {
  const bets = await fetchRecentPoolBets(poolId);
  return bets.map((bet) => ({
    id: bet.id,
    poolId: bet.pool_id,
    outcomeId: bet.outcome_id,
    label: bet.driver_name ?? bet.team_name,
    primaryLabel: bet.driver_name ?? bet.team_name,
    secondaryLabel: bet.driver_name ? bet.team_name : undefined,
    accentColor: bet.team_color ?? getTeamColor(bet.team_name),
    participantType: bet.driver_name ? "driver" : "team",
    amount: Number(bet.amount ?? 0),
    placedAt: bet.created_at,
    oddsAtPlacement: Number(bet.odds_at_placement ?? 0)
  }));
};
