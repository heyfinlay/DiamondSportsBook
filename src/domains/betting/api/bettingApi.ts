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

export interface MarketOutcome {
  id: string;
  label: string;
  pool: number;
  color: string | null;
  driverName: string;
  teamName: string | null;
  teamColor: string | null;
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
    outcomes: MarketOutcome[];
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
          metadata,
          driver:timing_drivers(
            name,
            team_name,
            primary_color
          )
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
            outcomes: (market.outcomes ?? []).map((outcome: any) => mapOutcomeRow(outcome))
          })) ?? []
    })) ?? []
  );
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
          color,
          metadata,
          driver:timing_drivers(
            name,
            team_name,
            primary_color
          )
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
          outcomes: (market.outcomes ?? []).map((outcome: any) => mapOutcomeRow(outcome))
        })) ?? []
    });
  }

  return results;
};

export type OutcomeQuote = MarketOutcome;

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
    .select(
      `
      id,
      label,
      pool,
      color,
      metadata,
      driver:timing_drivers(
        name,
        team_name,
        primary_color
      )
    `
    )
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
    outcomes: (outcomes ?? []).map((outcome: any) => mapOutcomeRow(outcome))
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
  outcome_driver_name: string;
  outcome_team_name: string | null;
  outcome_team_color: string | null;
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
      outcome:outcomes(
        id,
        label,
        color,
        metadata,
        driver:timing_drivers(
          name,
          team_name,
          primary_color
        )
      ),
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
      const outcomeRow = outcome as RawOutcomeRow | null;
      const participant = outcomeRow
        ? deriveParticipantDetails({
            label: outcomeRow.label ?? "Unknown outcome",
            metadata: outcomeRow.metadata ?? {},
            color: outcomeRow.color ?? null,
            driver: outcomeRow.driver ?? null
          })
        : { driverName: "Unknown outcome", teamName: null, teamColor: null };
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
        outcome_driver_name: participant.driverName,
        outcome_team_name: participant.teamName,
        outcome_team_color: participant.teamColor,
        market_name: market?.name ?? "Unknown market",
        market_type: market?.pool_type ?? "",
        event_id: normalizedEvent?.id ?? "",
        event_title: normalizedEvent?.title ?? "Event TBD"
      };
    }) ?? []
  );
};

const extractSingle = (value: any) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
};

type RawDriverRow = {
  name?: string | null;
  team_name?: string | null;
  primary_color?: string | null;
};

type RawOutcomeRow = {
  id: string;
  label: string;
  pool?: number | null;
  color?: string | null;
  metadata?: Record<string, unknown> | null;
  driver?: RawDriverRow | RawDriverRow[] | null;
};

const mapOutcomeRow = (outcome: RawOutcomeRow): MarketOutcome => {
  const participant = deriveParticipantDetails(outcome);
  return {
    id: outcome.id,
    label: outcome.label,
    pool: Number(outcome.pool ?? 0),
    color: outcome.color ?? null,
    driverName: participant.driverName,
    teamName: participant.teamName,
    teamColor: participant.teamColor
  };
};

const deriveParticipantDetails = (
  outcome: Pick<RawOutcomeRow, "label" | "metadata" | "color" | "driver">
) => {
  const driverRow = extractSingle(outcome.driver) as RawDriverRow | null;
  const metadata = (outcome.metadata ?? {}) as Record<string, unknown>;

  const metadataDriver =
    getString(metadata.driver_name) ?? getString(metadata.driverName);
  const metadataTeam =
    getString(metadata.team_name) ?? getString(metadata.teamName);
  const metadataColor =
    getString(metadata.team_color) ??
    getString(metadata.teamColor) ??
    getString(metadata.primary_color) ??
    getString(metadata.primaryColor);

  const driverName =
    getString(driverRow?.name) ?? metadataDriver ?? outcome.label;
  const teamName = metadataTeam ?? getString(driverRow?.team_name) ?? null;
  const teamColor =
    metadataColor ??
    getString(driverRow?.primary_color) ??
    getString(outcome.color) ??
    null;

  return {
    driverName,
    teamName,
    teamColor
  };
};

const getString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};
