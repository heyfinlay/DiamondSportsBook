import { fetchMarketDetail, fetchMarketEvents } from "@domains/betting/api/bettingApi";
import {
  mapEventWithMarketsToUiPools,
  mapMarketDetailToUiPool,
  type MarketDetailData
} from "./domain/adapter";
import type { LiveBet, Pool } from "./types";

export const fetchUiPools = async (): Promise<Pool[]> => {
  const events = await fetchMarketEvents();
  return mapEventWithMarketsToUiPools(events);
};

export const fetchUiPoolById = async (poolId: string): Promise<Pool | null> => {
  const detail = await fetchMarketDetail(poolId);
  return mapMarketDetailToUiPool(detail as unknown as MarketDetailData);
};

export const fetchUiLiveBetsForPool = async (_poolId: string): Promise<LiveBet[]> => {
  // Live bet feed is not exposed publicly yet; return an empty list so the UI renders gracefully.
  return [];
};
