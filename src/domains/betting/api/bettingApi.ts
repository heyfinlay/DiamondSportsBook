import { supabase } from "@lib/supabaseClient";
import type { MarketContainerStatus, PoolStatus } from "./marketAdminApi";

export interface MarketSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_pool: number;
  min_stake?: number;
  max_stake?: number;
  close_time?: string | null;
  event: {
    id: string;
    title: string;
    takeout: number;
  };
}

export interface EventWithMarkets {
  id: string;
  title: string;
  description: string | null;
  status: MarketContainerStatus;
  starts_at: string | null;
  takeout: number;
  session: {
    id: string;
    name: string;
    track_name: string | null;
    mode: string | null;
  } | null;
  markets: Array<{
    id: string;
    name: string;
    description: string | null;
    status: PoolStatus;
    // Lifecycle: archived markets should not appear on the public board
    archived?: boolean;
    settled_at?: string | null;
    archived_at?: string | null;
    pool_type: string;
    total_pool: number;
    min_stake: number;
    max_stake: number;
    close_time: string | null;
    outcomes: Array<{
      id: string;
      label: string;
      pool: number;
      color: string | null;
      metadata?: Record<string, unknown> | null;
    }>;
  }>;
}

export interface PoolPricingRow {
  pool_id: string;
  pool_name: string;
  pool_status: string;
  rake_percent: number | null;
  close_time: string | null;
  updated_at: string | null;
  total_stake: number | null;
  total_bets: number | null;
  last_activity_at: string | null;
  outcome_id: string;
  outcome_label: string;
  team_name: string | null;
  team_color: string | null;
  driver_name: string | null;
  outcome_stake: number | null;
  outcome_bets: number | null;
  baseline_odds: number | null;
}

export interface RecentPoolBet {
  id: string;
  pool_id: string;
  outcome_id: string;
  team_name: string;
  team_color: string | null;
  driver_name: string | null;
  amount: number;
  odds_at_placement: number | null;
  created_at: string;
}

export const fetchMarkets = async () => {
  const { data, error } = await supabase
    .from("markets")
    .select("id, name, description, status, total_pool, event:events(id, title, takeout)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (
    data?.map((market) => ({
      id: market.id,
      name: market.name,
      description: market.description,
      status: market.status,
      total_pool: Number(market.total_pool),
      event: {
        id: extractSingle(market.event)?.id,
        title: extractSingle(market.event)?.title,
        takeout: Number(extractSingle(market.event)?.takeout ?? 0)
      }
    })) ?? []
  );
};

export const fetchMarketEvents = async (): Promise<EventWithMarkets[]> => {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      description,
      starts_at,
      status,
      takeout,
      session:timing_sessions(
        id,
        name,
        track_name,
        mode
      ),
      markets:markets(
        id,
        name,
        description,
        status,
        archived,
        settled_at,
        pool_type,
        total_pool,
        min_stake,
        max_stake,
        close_time,
        outcomes:outcomes(
          id,
          label,
          pool,
          color,
          metadata
        )
      )
    `
    )
    .order("starts_at", { ascending: true })
    .order("created_at", { foreignTable: "markets", ascending: true });

  if (error) throw error;

  return (
    data?.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description ?? null,
      starts_at: event.starts_at ?? null,
      status: event.status as MarketContainerStatus,
      takeout: Number(event.takeout ?? 0),
      session: (() => {
        const sessionRow = extractSingle(event.session);
        return sessionRow
          ? {
              id: sessionRow.id,
              name: sessionRow.name,
              track_name: sessionRow.track_name ?? null,
              mode: sessionRow.mode ?? null
            }
          : null;
      })(),
      markets:
        // Lifecycle: only show non-archived, non-settled markets in public board.
        (event.markets as EventWithMarkets["markets"])
          ?.filter(
            (market) =>
              !market.archived &&
              ["open", "closed"].includes(market.status as string)
          )
          .map((market) => ({
            id: market.id,
            name: market.name,
            description: market.description ?? null,
            status: market.status as PoolStatus,
            archived: !!market.archived,
            settled_at: market.settled_at ?? null,
            pool_type: market.pool_type,
            total_pool: Number(market.total_pool ?? 0),
            min_stake: Number(market.min_stake ?? 0),
            max_stake: Number(market.max_stake ?? 0),
            close_time: market.close_time ?? null,
            outcomes:
              market.outcomes?.map((outcome) => ({
                id: outcome.id,
                label: outcome.label,
                pool: Number(outcome.pool ?? 0),
                color: outcome.color ?? null,
                metadata: outcome.metadata ?? null
              })) ?? []
          })) ?? []
    })) ?? []
  );
};

export const fetchPoolsPricing = async (): Promise<PoolPricingRow[]> => {
  const { data, error } = await supabase.rpc("get_pools_pricing");
  if (error) throw error;
  return (data as PoolPricingRow[]) ?? [];
};

export const fetchPoolPricing = async (poolId: string): Promise<PoolPricingRow[]> => {
  if (!poolId) throw new Error("poolId is required");
  const allPools = await fetchPoolsPricing();
  return allPools.filter((row) => row.pool_id === poolId);
};

export const fetchRecentPoolBets = async (
  poolId: string,
  limit = 40
): Promise<RecentPoolBet[]> => {
  const { data, error } = await supabase.rpc("get_recent_pool_bets", {
    p_pool_id: poolId,
    p_limit: limit
  });
  if (error) throw error;
  return (data as RecentPoolBet[]) ?? [];
};

export const fetchArchivedMarketEvents = async (): Promise<EventWithMarkets[]> => {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      description,
      starts_at,
      status,
      takeout,
      session:timing_sessions(
        id,
        name,
        track_name,
        mode,
        archived_at
      ),
      markets:markets(
        id,
        name,
        description,
        status,
        archived,
        settled_at,
        archived_at,
        pool_type,
        total_pool,
        min_stake,
        max_stake,
        close_time,
        outcomes:outcomes(
          id,
          label,
          pool,
          color
        )
      )
    `
    )
    .order("starts_at", { ascending: false });

  if (error) throw error;

  const results: EventWithMarkets[] = [];

  for (const event of data ?? []) {
    const sessionRow = extractSingle(event.session);
    // Only include events with archived sessions or settled/archived status
    if (
      !sessionRow?.archived_at &&
      !["settled", "archived"].includes(event.status as string)
    ) {
      continue;
    }

    results.push({
      id: event.id,
      title: event.title,
      description: event.description ?? null,
      starts_at: event.starts_at ?? null,
      status: event.status as MarketContainerStatus,
      takeout: Number(event.takeout ?? 0),
      session: sessionRow
        ? {
            id: sessionRow.id,
            name: sessionRow.name,
            track_name: sessionRow.track_name ?? null,
            mode: sessionRow.mode ?? null
          }
        : null,
      markets:
        (event.markets as any[])?.map((market) => ({
          id: market.id,
          name: market.name,
          description: market.description ?? null,
          status: market.status as PoolStatus,
          archived: !!market.archived,
          settled_at: market.settled_at ?? null,
          archived_at: market.archived_at ?? null,
          pool_type: market.pool_type,
          total_pool: Number(market.total_pool ?? 0),
          min_stake: Number(market.min_stake ?? 0),
          max_stake: Number(market.max_stake ?? 0),
          close_time: market.close_time ?? null,
          outcomes:
            market.outcomes?.map((outcome: any) => ({
              id: outcome.id,
              label: outcome.label,
              pool: Number(outcome.pool ?? 0),
              color: outcome.color ?? null
            })) ?? []
        })) ?? []
    });
  }

  return results;
};

export interface OutcomeQuote {
  id: string;
  label: string;
  pool: number;
}

export const fetchMarketDetail = async (marketId: string) => {
  const { data, error } = await supabase
    .from("markets")
    .select(
      `
        *,
        event:events(id, title, description, status, takeout)
      `
    )
    .eq("id", marketId)
    .single();

  if (error) throw error;

  const { data: outcomes, error: outcomesError } = await supabase
    .from("outcomes")
    .select("id, label, pool, color, metadata")
    .eq("market_id", marketId);

  if (outcomesError) throw outcomesError;

  return {
    market: {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      pool_type: data.pool_type,
      rake_percent: Number(data.rake_percent ?? 0),
      total_pool: Number(data.total_pool),
      min_stake: Number(data.min_stake),
      max_stake: Number(data.max_stake),
      event: extractSingle(data.event)
    },
    outcomes:
      outcomes?.map((outcome) => ({
        id: outcome.id,
        label: outcome.label,
        pool: Number(outcome.pool),
        color: outcome.color ?? null
      })) ?? []
  };
};

export const previewWager = async (marketId: string, outcomeId: string, stake: number) => {
  const { data, error } = await supabase.rpc("betting_preview_wager", {
    p_market_id: marketId,
    p_outcome_id: outcomeId,
    p_stake: stake
  });

  if (error) throw error;
  return {
    baselineOdds: Number(data?.baseline_odds ?? 0),
    effectiveOdds: Number(data?.effective_odds ?? 0),
    priceImpact: Number(data?.price_impact ?? 0),
    impliedProbability: Number(data?.implied_probability ?? 0),
    estimatedPayout: Number(data?.estimated_payout ?? 0)
  };
};

export const placeWager = async (
  marketId: string,
  outcomeId: string,
  stake: number,
  idempotencyKey?: string
) => {
  const { data, error } = await supabase.rpc("betting_place_wager", {
    p_market_id: marketId,
    p_outcome_id: outcomeId,
    p_stake: stake,
    p_idempotency_key: idempotencyKey ?? null
  });

  if (error) throw error;
  return data;
};

export interface UserWager {
  id: string;
  market_id: string;
  outcome_id: string;
  event_id: string;
  stake: number;
  status: string;
  effective_odds: number;
  estimated_payout: number;
  settled_payout: number | null;
  created_at: string;
  outcome_label: string;
  market_name: string;
  market_type: string;
  event_title: string;
}

export const fetchUserWagers = async (userId: string, limit = 20): Promise<UserWager[]> => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("wagers")
    .select(
      `
      id,
      market_id,
      stake,
      status,
      effective_odds,
      estimated_payout,
      settled_payout,
      created_at,
      outcome:outcomes(id, label),
      market:markets(
        id,
        name,
        pool_type,
        event:events(id, title)
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (
    data?.map((row) => {
      const outcome = Array.isArray(row.outcome) ? row.outcome[0] : row.outcome;
      const market = Array.isArray(row.market) ? row.market[0] : row.market;
      const event = market?.event;
      const normalizedEvent = Array.isArray(event) ? event[0] : event;
      return {
        id: row.id,
        market_id: row.market_id,
        stake: Number(row.stake ?? 0),
        status: row.status,
        effective_odds: Number(row.effective_odds ?? 0),
        estimated_payout: Number(row.estimated_payout ?? 0),
        settled_payout: row.settled_payout ? Number(row.settled_payout) : null,
        created_at: row.created_at,
        outcome_id: outcome?.id ?? "",
        outcome_label: outcome?.label ?? "Unknown outcome",
        market_name: market?.name ?? "Unknown market",
        market_type: market?.pool_type ?? "",
        event_id: normalizedEvent?.id ?? "",
        event_title: normalizedEvent?.title ?? "Event TBD"
      };
    }) ?? []
  );
};

export interface WagerDetail {
  id: string;
  user_id: string;
  market_id: string;
  outcome_id: string;
  stake: number;
  status: string;
  effective_odds: number;
  estimated_payout: number;
  settled_payout: number | null;
  created_at: string;
  market: {
    id: string;
    name: string;
    pool_type: string;
    total_pool: number;
    rake_percent: number;
    close_time: string | null;
    event: { id: string; title: string } | null;
  } | null;
  outcome: { id: string; label: string } | null;
}

export const fetchWagerById = async (wagerId: string): Promise<WagerDetail | null> => {
  if (!wagerId) return null;
  const { data, error } = await supabase
    .from("wagers")
    .select(
      `
      id,
      user_id,
      market_id,
      outcome_id,
      stake,
      status,
      effective_odds,
      estimated_payout,
      settled_payout,
      created_at,
      outcome:outcomes(id, label),
      market:markets(
        id,
        name,
        pool_type,
        total_pool,
        rake_percent,
        close_time,
        event:events(id, title)
      )
    `
    )
    .eq("id", wagerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const outcomeRow = Array.isArray(data.outcome) ? data.outcome[0] : data.outcome;
  const marketRow = Array.isArray(data.market) ? data.market[0] : data.market;
  const eventRow = marketRow?.event;
  const normalizedEvent = Array.isArray(eventRow) ? eventRow[0] : eventRow;

  return {
    id: data.id,
    user_id: data.user_id,
    market_id: data.market_id,
    outcome_id: data.outcome_id,
    stake: Number(data.stake ?? 0),
    status: data.status,
    effective_odds: Number(data.effective_odds ?? 0),
    estimated_payout: Number(data.estimated_payout ?? 0),
    settled_payout: data.settled_payout ? Number(data.settled_payout) : null,
    created_at: data.created_at,
    market: marketRow
      ? {
          id: marketRow.id,
          name: marketRow.name,
          pool_type: marketRow.pool_type,
          total_pool: Number(marketRow.total_pool ?? 0),
          rake_percent: Number(marketRow.rake_percent ?? 0),
          close_time: marketRow.close_time ?? null,
          event: normalizedEvent
            ? {
                id: normalizedEvent.id,
                title: normalizedEvent.title
              }
            : null
        }
      : null,
    outcome: outcomeRow
      ? {
          id: outcomeRow.id,
          label: outcomeRow.label
        }
      : null
  };
};

const extractSingle = (value: any) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
};
