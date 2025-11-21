import { supabase } from "@lib/supabaseClient";
import {
  mapDbLiveBetToUiLiveBet,
  mapPricingRowsToPools,
  type DbLiveBet,
  type PoolPricingRow
} from "./domain/adapter";
import type { LiveBet, Pool } from "./types";

// Data sources:
// - get_pools_pricing (RPC) aggregates wagers for pool + outcome stats and odds.
// - get_pool_pricing (RPC) single-pool variant.
// - get_recent_pool_bets (RPC) anonymized recent bets for live feed.

export const fetchUiPools = async (): Promise<Pool[]> => {
  const { data, error } = await supabase.rpc("get_pools_pricing");
  if (error) throw error;
  return mapPricingRowsToPools((data as PoolPricingRow[]) ?? []);
};

export const fetchUiPoolById = async (poolId: string): Promise<Pool | null> => {
  const { data, error } = await supabase.rpc("get_pool_pricing", { p_pool_id: poolId });
  if (error) throw error;
  const pools = mapPricingRowsToPools((data as PoolPricingRow[]) ?? []);
  return pools[0] ?? null;
};

export const fetchUiLiveBetsForPool = async (poolId: string, limit = 30): Promise<LiveBet[]> => {
  const { data, error } = await supabase.rpc("get_recent_pool_bets", {
    p_pool_id: poolId,
    p_limit: limit
  });
  if (error) {
    return [];
  }
  return (data as DbLiveBet[] | null)?.map(mapDbLiveBetToUiLiveBet) ?? [];
};
