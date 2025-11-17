import { supabase } from "@lib/supabaseClient";

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
  venue: string | null;
  starts_at: string | null;
  status: string;
  takeout: number;
  markets: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    type: string;
    total_pool: number;
    min_stake: number;
    max_stake: number;
    close_time: string | null;
    outcomes: Array<{
      id: string;
      label: string;
      pool: number;
    }>;
  }>;
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
      venue,
      starts_at,
      status,
      takeout,
      markets:markets(
        id,
        name,
        description,
        status,
        type,
        total_pool,
        min_stake,
        max_stake,
        close_time,
        outcomes:outcomes(
          id,
          label,
          pool
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
      venue: event.venue ?? null,
      starts_at: event.starts_at ?? null,
      status: event.status,
      takeout: Number(event.takeout ?? 0),
      markets:
        (event.markets as EventWithMarkets["markets"])?.map((market) => ({
          id: market.id,
          name: market.name,
          description: market.description ?? null,
          status: market.status,
          type: market.type,
          total_pool: Number(market.total_pool ?? 0),
          min_stake: Number(market.min_stake ?? 0),
          max_stake: Number(market.max_stake ?? 0),
          close_time: market.close_time ?? null,
          outcomes:
            market.outcomes?.map((outcome) => ({
              id: outcome.id,
              label: outcome.label,
              pool: Number(outcome.pool ?? 0)
            })) ?? []
        })) ?? []
    })) ?? []
  );
};

export interface OutcomeQuote {
  id: string;
  label: string;
  pool: number;
}

export const fetchMarketDetail = async (marketId: string) => {
  const { data, error } = await supabase
    .from("markets")
    .select("*, event:events(*)")
    .eq("id", marketId)
    .single();

  if (error) throw error;

  const { data: outcomes, error: outcomesError } = await supabase
    .from("outcomes")
    .select("*")
    .eq("market_id", marketId);

  if (outcomesError) throw outcomesError;

  return {
    market: {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      total_pool: Number(data.total_pool),
      min_stake: Number(data.min_stake),
      max_stake: Number(data.max_stake),
      event: extractSingle(data.event)
    },
    outcomes: outcomes?.map((outcome) => ({
      id: outcome.id,
      label: outcome.label,
      pool: Number(outcome.pool)
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

const extractSingle = (value: any) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
};
