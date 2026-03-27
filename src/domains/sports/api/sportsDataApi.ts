import { supabase } from "@lib/supabaseClient";

export type SportCode = "f1" | "nrl" | "afl" | "mma" | "soccer";

export interface SportsParticipantSnapshot {
  id: string;
  displayName: string;
  shortName: string | null;
  abbreviation: string | null;
  participantType: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  imageUrl: string | null;
  side: string | null;
  slot: number | null;
  liveRank: number | null;
  score: number | null;
  metadata: Record<string, unknown>;
}

export interface SportsResultSnapshot {
  participantId: string;
  participantName: string;
  abbreviation: string | null;
  participantType: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  resultStatus: string;
  resultPosition: number | null;
  resultCode: string | null;
  outcomeText: string | null;
  scoreText: string | null;
  metadata: Record<string, unknown>;
}

export interface SportsPoolOutcome {
  id: string;
  label: string;
  pool: number;
  color: string | null;
  participantType: string | null;
  participantId: string | null;
  sportsParticipantId: string | null;
  resultKey: string | null;
  displayOrder: number | null;
  metadata: Record<string, unknown> | null;
}

export interface SportsPoolSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  archived: boolean;
  settledAt: string | null;
  poolType: string;
  totalPool: number;
  minStake: number;
  maxStake: number;
  closeTime: string | null;
  autoManaged: boolean;
  tradingStatusReason: string | null;
  outcomes: SportsPoolOutcome[];
}

export interface SportsBoardEvent {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startsAt: string | null;
  takeout: number;
  sourceType: string | null;
  sportCode: SportCode | null;
  marketTemplateKey: string | null;
  externalStatus: string | null;
  autoCreated: boolean;
  published: boolean;
  publishedAt: string | null;
  sportsEvent: {
    id: string;
    title: string;
    status: string;
    eventType: string;
    scheduledStart: string | null;
    venueName: string | null;
    roundLabel: string | null;
    liveClock: string | null;
    liveState: Record<string, unknown>;
    externalPayload: Record<string, unknown>;
    competition: {
      id: string;
      name: string;
      shortName: string | null;
      sportCode: SportCode | null;
    } | null;
    participants: SportsParticipantSnapshot[];
    results: SportsResultSnapshot[];
  } | null;
  markets: SportsPoolSummary[];
}

export interface SportsProviderHealthRow {
  provider_id: string;
  provider_key: string;
  display_name: string;
  enabled: boolean;
  quota_limit: number | null;
  quota_window: string | null;
  sport_code: SportCode | null;
  job_type: string | null;
  status: string | null;
  request_count: number | null;
  records_written: number | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  context: Record<string, unknown> | null;
}

export interface SportsSyncRequest {
  mode?: "schedule" | "live" | "settlement" | "full";
  sports?: SportCode[];
  dryRun?: boolean;
  date?: string;
  daysAhead?: number;
  daysBack?: number;
}

export interface SportsSyncResponse {
  ok: boolean;
  provider: string;
  mode: string;
  dryRun: boolean;
  requestCount: number;
  remainingAfterRun: number;
  sports: Record<string, unknown>;
}

export interface FetchSportsBoardOptions {
  limit?: number;
  sportCode?: SportCode | null;
  includeUnpublished?: boolean;
}

const SPORT_CODES = new Set<SportCode>(["f1", "nrl", "afl", "mma", "soccer"]);

const extractSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
};

const normalizeSportCode = (value: unknown): SportCode | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return SPORT_CODES.has(normalized as SportCode) ? (normalized as SportCode) : null;
};

const mapJson = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const isMissingSportsSchemaError = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST200" ||
    error.code === "PGRST205" ||
    /sports_/i.test(error.message ?? "")
  );
};

const mapBoardEvent = (row: any): SportsBoardEvent => {
  const sportsEvent = extractSingle(row.sports_event);
  const competition = extractSingle(sportsEvent?.competition);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    startsAt: row.starts_at ?? null,
    takeout: Number(row.takeout ?? 0),
    sourceType: row.source_type ?? null,
    sportCode: normalizeSportCode(row.sport_code ?? competition?.sport_code ?? sportsEvent?.sport_code),
    marketTemplateKey: row.market_template_key ?? null,
    externalStatus: row.external_status ?? null,
    autoCreated: Boolean(row.auto_created),
    published: Boolean(row.published ?? true),
    publishedAt: row.published_at ?? null,
    sportsEvent: sportsEvent
      ? {
          id: sportsEvent.id,
          title: sportsEvent.title,
          status: sportsEvent.status,
          eventType: sportsEvent.event_type,
          scheduledStart: sportsEvent.scheduled_start ?? null,
          venueName: sportsEvent.venue_name ?? null,
          roundLabel: sportsEvent.round_label ?? null,
          liveClock: sportsEvent.live_clock ?? null,
          liveState: mapJson(sportsEvent.live_state),
          externalPayload: mapJson(sportsEvent.external_payload),
          competition: competition
            ? {
                id: competition.id,
                name: competition.name,
                shortName: competition.short_name ?? null,
                sportCode: normalizeSportCode(competition.sport_code)
              }
            : null,
          participants:
            sportsEvent.participants?.map((entry: any) => {
              const participant = extractSingle(entry.participant);
              return {
                id: participant?.id ?? crypto.randomUUID(),
                displayName: participant?.display_name ?? "Participant",
                shortName: participant?.short_name ?? null,
                abbreviation: participant?.abbreviation ?? null,
                participantType: participant?.participant_type ?? "custom",
                primaryColor: participant?.primary_color ?? null,
                secondaryColor: participant?.secondary_color ?? null,
                imageUrl: participant?.image_url ?? null,
                side: entry.side ?? null,
                slot: entry.slot ?? null,
                liveRank: entry.live_rank ?? null,
                score: entry.score != null ? Number(entry.score) : null,
                metadata: mapJson(entry.metadata)
              };
            }) ?? [],
          results:
            sportsEvent.results?.map((entry: any) => {
              const participant = extractSingle(entry.participant);
              return {
                participantId: participant?.id ?? "",
                participantName: participant?.display_name ?? "Participant",
                abbreviation: participant?.abbreviation ?? null,
                participantType: participant?.participant_type ?? "custom",
                primaryColor: participant?.primary_color ?? null,
                secondaryColor: participant?.secondary_color ?? null,
                resultStatus: entry.result_status,
                resultPosition: entry.result_position ?? null,
                resultCode: entry.result_code ?? null,
                outcomeText: entry.outcome_text ?? null,
                scoreText: entry.score_text ?? null,
                metadata: mapJson(entry.metadata)
              };
            }) ?? []
        }
      : null,
    markets:
      row.markets?.map((market: any) => ({
        id: market.id,
        name: market.name,
        description: market.description ?? null,
        status: market.status,
        archived: Boolean(market.archived),
        settledAt: market.settled_at ?? null,
        poolType: market.pool_type,
        totalPool: Number(market.total_pool ?? 0),
        minStake: Number(market.min_stake ?? 0),
        maxStake: Number(market.max_stake ?? 0),
        closeTime: market.close_time ?? null,
        autoManaged: Boolean(market.auto_managed),
        tradingStatusReason: market.trading_status_reason ?? null,
        outcomes:
          market.outcomes?.map((outcome: any) => ({
            id: outcome.id,
            label: outcome.label,
            pool: Number(outcome.pool ?? 0),
            color: outcome.color ?? null,
            participantType: outcome.participant_type ?? null,
            participantId: outcome.participant_id ?? null,
            sportsParticipantId: outcome.sports_participant_id ?? null,
            resultKey: outcome.result_key ?? null,
            displayOrder: outcome.display_order ?? null,
            metadata: outcome.metadata ?? null
          })) ?? []
      })) ?? []
  };
};

const baseSelect = `
  id,
  title,
  description,
  status,
  starts_at,
  takeout,
  source_type,
  sport_code,
  market_template_key,
  external_status,
  auto_created,
  published,
  published_at,
  sports_event:sports_events(
    id,
    title,
    status,
    event_type,
    scheduled_start,
    venue_name,
    round_label,
    live_clock,
    live_state,
    external_payload,
    competition:sports_competitions(
      id,
      name,
      short_name,
      sport_code
    ),
    participants:sports_event_participants(
      side,
      slot,
      live_rank,
      score,
      metadata,
      participant:sports_participants(
        id,
        display_name,
        short_name,
        abbreviation,
        participant_type,
        primary_color,
        secondary_color,
        image_url
      )
    ),
    results:sports_event_results(
      result_status,
      result_position,
      result_code,
      outcome_text,
      score_text,
      metadata,
      participant:sports_participants(
        id,
        display_name,
        abbreviation,
        participant_type,
        primary_color,
        secondary_color
      )
    )
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
    auto_managed,
    trading_status_reason,
    outcomes:outcomes(
      id,
      label,
      pool,
      color,
      participant_type,
      participant_id,
      sports_participant_id,
      metadata,
      result_key,
      display_order
    )
  )
`;

export const fetchSportsBoardEvents = async (
  options: number | FetchSportsBoardOptions = 24
): Promise<SportsBoardEvent[]> => {
  const normalizedOptions =
    typeof options === "number" ? { limit: options } : options;

  let query = supabase
    .from("events")
    .select(baseSelect)
    .eq("source_type", "external_feed")
    .order("starts_at", { ascending: true })
    .limit(normalizedOptions.limit ?? 24);

  if (normalizedOptions.sportCode) {
    query = query.eq("sport_code", normalizedOptions.sportCode);
  }

  if (!normalizedOptions.includeUnpublished) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSportsSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []).map(mapBoardEvent);
};

export const fetchSportsEventDetail = async (
  eventId: string,
  options?: { includeUnpublished?: boolean }
): Promise<SportsBoardEvent | null> => {
  let query = supabase
    .from("events")
    .select(baseSelect)
    .eq("id", eventId);

  if (!options?.includeUnpublished) {
    query = query.eq("published", true);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116" || isMissingSportsSchemaError(error)) return null;
    throw error;
  }

  return mapBoardEvent(data);
};

export const fetchSportsProviderHealth = async (): Promise<SportsProviderHealthRow[]> => {
  const { data, error } = await supabase
    .from("sports_provider_health")
    .select("*")
    .order("provider_key", { ascending: true });

  if (error) {
    if (isMissingSportsSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    provider_id: row.provider_id,
    provider_key: row.provider_key,
    display_name: row.display_name,
    enabled: Boolean(row.enabled),
    quota_limit: row.quota_limit != null ? Number(row.quota_limit) : null,
    quota_window: row.quota_window ?? null,
    sport_code: normalizeSportCode(row.sport_code),
    job_type: row.job_type ?? null,
    status: row.status ?? null,
    request_count: row.request_count != null ? Number(row.request_count) : null,
    records_written: row.records_written != null ? Number(row.records_written) : null,
    started_at: row.started_at ?? null,
    finished_at: row.finished_at ?? null,
    error_message: row.error_message ?? null,
    context: row.context ?? null
  }));
};

export const triggerSportsSync = async (
  request: SportsSyncRequest
): Promise<SportsSyncResponse> => {
  const { data, error } = await supabase.functions.invoke("sportradar-sync", {
    body: request
  });

  if (error) {
    throw error;
  }

  return data as SportsSyncResponse;
};

export const publishSportsEvent = async (eventId: string) => {
  const { data, error } = await supabase.rpc("sports_admin_publish_event", {
    p_event_id: eventId
  });

  if (error) throw error;
  return data;
};

export const unpublishSportsEvent = async (eventId: string) => {
  const { data, error } = await supabase.rpc("sports_admin_unpublish_event", {
    p_event_id: eventId
  });

  if (error) throw error;
  return data;
};
