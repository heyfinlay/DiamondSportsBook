import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

type SportCode = "f1" | "nrl" | "afl" | "mma" | "soccer";
type SyncMode = "schedule" | "live" | "settlement" | "full";
type SportsEventStatus = "scheduled" | "live" | "paused" | "completed" | "official" | "cancelled";
type SportsResultStatus = "provisional" | "official";

interface SyncPayload {
  mode?: SyncMode;
  sports?: SportCode[];
  dryRun?: boolean;
  date?: string;
  daysAhead?: number;
  daysBack?: number;
}

interface ProviderConfigEntry {
  enabled?: boolean;
  package?: string;
  allowed_competition_names?: string[];
  allowed_competition_ids?: string[];
  current_season_id?: string;
  resolved_season_id?: string;
  schedule_days_ahead?: number;
  schedule_days_back?: number;
  schedule_detail_cap?: number;
  live_detail_cap?: number;
}

interface ProviderConfig {
  access_level?: string;
  language_code?: string;
  request_budget?: {
    soft_monthly_limit?: number;
    per_run_request_cap?: number;
    live_detail_cap?: number;
    schedule_days_ahead?: number;
    schedule_days_back?: number;
  };
  sports?: Partial<Record<SportCode, ProviderConfigEntry>>;
}

interface NormalizedCompetition {
  providerCompetitionId: string;
  name: string;
  shortName?: string | null;
  countryCode?: string | null;
  metadata?: Record<string, unknown>;
}

interface NormalizedSeason {
  providerSeasonId?: string | null;
  name: string;
  year?: number | null;
  metadata?: Record<string, unknown>;
}

interface NormalizedParticipant {
  providerParticipantId: string;
  displayName: string;
  shortName?: string | null;
  abbreviation?: string | null;
  participantType: string;
  imageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  side?: string | null;
  slot?: number | null;
  liveRank?: number | null;
  score?: number | null;
  metadata?: Record<string, unknown>;
}

interface NormalizedResult {
  providerParticipantId: string;
  resultStatus: SportsResultStatus;
  resultPosition?: number | null;
  resultCode?: string | null;
  outcomeText?: string | null;
  scoreText?: string | null;
  metadata?: Record<string, unknown>;
}

interface NormalizedEvent {
  providerEventId: string;
  title: string;
  sportCode: SportCode;
  eventType: string;
  status: SportsEventStatus;
  scheduledStart?: string | null;
  venueName?: string | null;
  roundLabel?: string | null;
  liveClock?: string | null;
  liveState?: Record<string, unknown>;
  competition?: NormalizedCompetition | null;
  season?: NormalizedSeason | null;
  participants: NormalizedParticipant[];
  results: NormalizedResult[];
  externalPayload: Record<string, unknown>;
}

interface F1SeasonCandidate {
  id: string;
  name: string | null;
  year: number | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
}

type JsonObject = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SPORTRADAR_API_KEY = Deno.env.get("SPORTRADAR_API_KEY");
const SYNC_SHARED_SECRET = Deno.env.get("SPORTRADAR_SYNC_SHARED_SECRET");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase function env is incomplete.");
}

if (!SPORTRADAR_API_KEY) {
  throw new Error("SPORTRADAR_API_KEY is not configured.");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const SPORT_CODES: SportCode[] = ["f1", "nrl", "afl", "mma", "soccer"];
const DEFAULT_SYNC_SPORTS: SportCode[] = ["f1", "nrl"];

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length ? value.trim() : null;

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
};

const asDate = (value: unknown): Date | null => {
  const normalized = asString(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const clone = new Date(date);
  clone.setUTCDate(clone.getUTCDate() + days);
  return clone;
};

const normalizeStatus = (rawValue: unknown, fallback: SportsEventStatus = "scheduled"): SportsEventStatus => {
  const value = (asString(rawValue) ?? "").toLowerCase();
  const compact = value.replace(/[\s-]+/g, "_");

  if (!value) return fallback;
  if (
    [
      "not_started",
      "notstarted",
      "scheduled",
      "created",
      "fixture",
      "time_tbd",
      "time_unknown",
      "tbd"
    ].includes(compact)
  ) {
    return "scheduled";
  }
  if (["cancelled", "canceled", "abandoned", "postponed"].some((token) => value.includes(token))) {
    return "cancelled";
  }
  if (["closed", "ended", "finished", "complete", "completed", "resulted", "official"].some((token) => value.includes(token))) {
    return "official";
  }
  if (["interrupted", "paused", "delayed", "suspended"].some((token) => value.includes(token))) {
    return "paused";
  }
  if (
    [
      "live",
      "inprogress",
      "in_progress",
      "running",
      "started",
      "halftime",
      "half_time"
    ].includes(compact) ||
    compact.startsWith("period_") ||
    compact === "period"
  ) {
    return "live";
  }

  return fallback;
};

const getDefaultParticipantType = (sport: SportCode) => {
  switch (sport) {
    case "f1":
      return "driver";
    case "mma":
      return "fighter";
    default:
      return "club";
  }
};

const getSportProduct = (sport: SportCode, config: ProviderConfigEntry = {}) => {
  switch (sport) {
    case "f1":
      return { product: "formula1", version: "v2" };
    case "nrl":
      return { product: `rugby-${config.package ?? "league"}`, version: "v3" };
    case "afl":
      return { product: "australianrules", version: "v3" };
    case "mma":
      return { product: "mma", version: "v2" };
    case "soccer":
      return { product: "soccer-extended", version: "v4" };
  }
};

const buildSummaryUrl = (sport: SportCode, config: ProviderConfig, sportConfig: ProviderConfigEntry, kind: "daily" | "live", date?: string) => {
  const access = config.access_level ?? "trial";
  const language = config.language_code ?? "en";
  const product = getSportProduct(sport, sportConfig);

  if (sport === "f1") {
    return null;
  }

  if (kind === "daily" && date) {
    return `https://api.sportradar.com/${product.product}/${access}/${product.version}/${language}/schedules/${date}/summaries.json`;
  }

  return `https://api.sportradar.com/${product.product}/${access}/${product.version}/${language}/schedules/live/summaries.json`;
};

const buildF1SeasonsUrl = (config: ProviderConfig) =>
  `https://api.sportradar.com/formula1/${config.access_level ?? "trial"}/v2/${config.language_code ?? "en"}/seasons.json`;

const buildF1StageScheduleUrl = (config: ProviderConfig, seasonId: string) =>
  `https://api.sportradar.com/formula1/${config.access_level ?? "trial"}/v2/${config.language_code ?? "en"}/sport_events/${seasonId}/schedule.json`;

const buildF1StageSummaryUrl = (config: ProviderConfig, stageId: string) =>
  `https://api.sportradar.com/formula1/${config.access_level ?? "trial"}/v2/${config.language_code ?? "en"}/sport_events/${stageId}/summary.json`;

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => asString(value)).filter((value): value is string => Boolean(value))));

const competitionAllowed = (
  candidates: {
    ids?: Array<string | null | undefined>;
    names?: Array<string | null | undefined>;
  },
  sportConfig: ProviderConfigEntry
) => {
  const allowedIds = uniqueStrings(sportConfig.allowed_competition_ids ?? []);
  const allowedNames = uniqueStrings(sportConfig.allowed_competition_names ?? []);

  if (!allowedIds.length && !allowedNames.length) return true;

  const candidateIds = uniqueStrings(candidates.ids ?? []);
  const candidateNames = uniqueStrings(candidates.names ?? []).map((value) => value.toLowerCase());

  if (allowedIds.length && candidateIds.some((value) => allowedIds.includes(value))) {
    return true;
  }

  if (allowedNames.length) {
    return allowedNames.some((allowedName) => {
      const normalized = allowedName.toLowerCase();
      return candidateNames.some((candidate) => candidate.includes(normalized));
    });
  }

  return false;
};

const getPayload = async (request: Request): Promise<SyncPayload> => {
  try {
    return (await request.json()) as SyncPayload;
  } catch {
    return {};
  }
};

const ensureAuthorized = async (request: Request) => {
  const secretHeader = request.headers.get("x-sync-secret");
  if (SYNC_SHARED_SECRET && secretHeader === SYNC_SHARED_SECRET) {
    return { actor: "scheduler" };
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    throw new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, permissions")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const role = asString(profile?.role) ?? "";
  const permissions = Array.isArray(profile?.permissions) ? (profile?.permissions as string[]) : [];
  const allowed =
    role === "super_admin" ||
    role === "sportsbook_admin" ||
    permissions.includes("betting_admin") ||
    permissions.includes("race_control");

  if (!allowed) {
    throw new Response(JSON.stringify({ error: "Operator role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return { actor: user.id };
};

class RequestTracker {
  count = 0;

  constructor(
    private readonly limit: number,
    private readonly label: string
  ) {}

  async fetchJson(url: string) {
    if (this.count >= this.limit) {
      throw new Error(`Request cap reached for ${this.label}`);
    }

    this.count += 1;
    const response = await fetch(url, {
      headers: {
        "x-api-key": SPORTRADAR_API_KEY as string,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sportradar ${response.status} for ${url}: ${text.slice(0, 300)}`);
    }

    return (await response.json()) as JsonObject;
  }
}

const loadProvider = async () => {
  const { data, error } = await admin
    .from("sports_providers")
    .select("id, provider_key, display_name, quota_limit, quota_window, config")
    .eq("provider_key", "sportradar")
    .single();

  if (error) throw error;
  return {
    id: data.id as string,
    quotaLimit: (data.quota_limit as number | null) ?? 1000,
    quotaWindow: (data.quota_window as string | null) ?? "30 days",
    config: asObject(data.config) as unknown as ProviderConfig
  };
};

const getRecentUsage = async (providerId: string) => {
  const since = addDays(new Date(), -30).toISOString();
  const { data, error } = await admin
    .from("sports_sync_runs")
    .select("request_count")
    .eq("provider_id", providerId)
    .gte("started_at", since);

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + ((row.request_count as number | null) ?? 0), 0);
};

const createRun = async (providerId: string, sport: SportCode, jobType: "schedule" | "live" | "settlement", context: Record<string, unknown>) => {
  const { data, error } = await admin
    .from("sports_sync_runs")
    .insert({
      provider_id: providerId,
      sport_code: sport,
      job_type: jobType,
      status: "running",
      context
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
};

const finishRun = async (
  runId: string,
  status: "completed" | "failed" | "partial" | "rate_limited",
  requestCount: number,
  recordsWritten: number,
  errorMessage?: string
) => {
  const { error } = await admin
    .from("sports_sync_runs")
    .update({
      status,
      request_count: requestCount,
      records_written: recordsWritten,
      finished_at: new Date().toISOString(),
      error_message: errorMessage ?? null
    })
    .eq("id", runId);

  if (error) throw error;
};

const findCurrentF1Season = (
  payload: JsonObject,
  preferredSeasonId?: string | null
): F1SeasonCandidate | null => {
  const seasons = asArray<JsonObject>(payload.seasons)
    .map<F1SeasonCandidate | null>((season) => {
      const id = asString(season.id);
      if (!id) return null;

      return {
        id,
        name: asString(season.name),
        year: asNumber(season.year),
        status: asString(season.status)?.toLowerCase() ?? null,
        startDate: asString(season.start_date),
        endDate: asString(season.end_date)
      };
    })
    .filter((season): season is F1SeasonCandidate => Boolean(season));

  if (!seasons.length) return null;

  const preferred = preferredSeasonId
    ? seasons.find((season) => season.id === preferredSeasonId)
    : null;

  if (preferred) return preferred;

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const activeSeasons = seasons
    .filter((season) => {
      const startDate = asDate(season.startDate);
      const endDate = asDate(season.endDate);
      const status = season.status ?? "";

      if (status.includes("inprogress") || status.includes("active") || status.includes("current")) {
        return true;
      }

      if (startDate && endDate) {
        return startDate <= now && endDate >= now;
      }

      return season.year === currentYear;
    })
    .sort((left, right) => {
      const rightStart = asDate(right.startDate)?.getTime() ?? 0;
      const leftStart = asDate(left.startDate)?.getTime() ?? 0;
      return rightStart - leftStart;
    });

  if (activeSeasons.length) return activeSeasons[0];

  const scheduledSeasons = seasons
    .filter((season) => {
      const startDate = asDate(season.startDate);
      return (
        (season.status ?? "").includes("scheduled") ||
        (startDate !== null && startDate.getTime() >= now.getTime())
      );
    })
    .sort((left, right) => {
      const leftStart = asDate(left.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightStart = asDate(right.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftStart - rightStart;
    });

  if (scheduledSeasons.length) return scheduledSeasons[0];

  const sameYearSeason =
    seasons.find((season) => season.year === currentYear) ??
    seasons.find((season) => season.name?.includes(String(currentYear)));

  if (sameYearSeason) return sameYearSeason;

  return [...seasons].sort((left, right) => {
    const rightEnd = asDate(right.endDate)?.getTime() ?? 0;
    const leftEnd = asDate(left.endDate)?.getTime() ?? 0;
    const rightYear = right.year ?? 0;
    const leftYear = left.year ?? 0;
    return rightEnd - leftEnd || rightYear - leftYear;
  })[0];
};

const persistResolvedF1Season = async (
  providerId: string,
  config: ProviderConfig,
  sportConfig: ProviderConfigEntry,
  season: F1SeasonCandidate
) => {
  try {
    const nextConfig: ProviderConfig = {
      ...config,
      sports: {
        ...(config.sports ?? {}),
        f1: {
          ...sportConfig,
          resolved_season_id: season.id,
          current_season_id: sportConfig.current_season_id ?? season.id
        }
      }
    };

    await admin
      .from("sports_providers")
      .update({ config: nextConfig as unknown as JsonObject })
      .eq("id", providerId);
  } catch (error) {
    console.error("Unable to persist resolved F1 season", error);
  }
};

const hydrateF1ScheduleWithSummaries = async (
  events: NormalizedEvent[],
  config: ProviderConfig,
  sportConfig: ProviderConfigEntry,
  tracker: RequestTracker
) => {
  const detailCap =
    sportConfig.schedule_detail_cap ??
    sportConfig.live_detail_cap ??
    config.request_budget?.live_detail_cap ??
    1;

  if (detailCap <= 0) return events;

  const now = Date.now();
  const detailCandidates = events
    .filter((event) => {
      const startTime = event.scheduledStart ? new Date(event.scheduledStart).getTime() : null;
      return startTime === null || startTime >= now - 48 * 60 * 60 * 1000;
    })
    .sort((left, right) => {
      const leftTime = left.scheduledStart ? new Date(left.scheduledStart).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.scheduledStart ? new Date(right.scheduledStart).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, detailCap);

  if (!detailCandidates.length) return events;

  const detailedById = new Map<string, NormalizedEvent>();

  for (const event of detailCandidates) {
    try {
      const summaryPayload = await tracker.fetchJson(buildF1StageSummaryUrl(config, event.providerEventId));
      const detailedEvent = mapF1Summary(summaryPayload);
      if (!detailedEvent) continue;

      detailedById.set(event.providerEventId, {
        ...event,
        ...detailedEvent,
        title: detailedEvent.title || event.title,
        scheduledStart: detailedEvent.scheduledStart ?? event.scheduledStart,
        venueName: detailedEvent.venueName ?? event.venueName,
        roundLabel: detailedEvent.roundLabel ?? event.roundLabel,
        participants: detailedEvent.participants.length ? detailedEvent.participants : event.participants,
        results: detailedEvent.results.length ? detailedEvent.results : event.results,
        externalPayload: {
          ...event.externalPayload,
          summary: detailedEvent.externalPayload
        }
      });
    } catch (error) {
      console.error(`Unable to enrich F1 stage ${event.providerEventId}`, error);
    }
  }

  return events.map((event) => detailedById.get(event.providerEventId) ?? event);
};

const mapTeamSummary = (sport: Exclude<SportCode, "f1">, entryValue: unknown): NormalizedEvent | null => {
  const entry = asObject(entryValue);
  const sportEvent = asObject(entry.sport_event);
  const context = asObject(sportEvent.sport_event_context ?? entry.sport_event_context);
  const competition = asObject(context.competition);
  const season = asObject(context.season);
  const round = asObject(context.round);
  const stageContext = asObject(context.stage);
  const groups = asArray<JsonObject>(context.groups);
  const status = asObject(entry.sport_event_status);
  const venue = asObject(sportEvent.venue);
  const competitors = asArray<JsonObject>(sportEvent.competitors);
  const providerEventId = asString(sportEvent.id);

  if (!providerEventId) return null;

  const homeScore = asNumber(status.home_score);
  const awayScore = asNumber(status.away_score);
  const normalizedStatus = normalizeStatus(
    status.status ?? status.match_status ?? sportEvent.status,
    "scheduled"
  );
  const participantType = getDefaultParticipantType(sport);

  const participants = competitors.map<NormalizedParticipant>((competitor, index) => {
    const side = asString(competitor.qualifier);
    const score = side === "home" ? homeScore : side === "away" ? awayScore : null;

    return {
      providerParticipantId: asString(competitor.id) ?? `unknown-${index + 1}`,
      displayName: asString(competitor.name) ?? `Competitor ${index + 1}`,
      shortName: asString(competitor.short_name),
      abbreviation: asString(competitor.abbreviation),
      participantType,
      imageUrl: asString(competitor.icon_path ?? competitor.image_path),
      primaryColor: asString(competitor.primary_color),
      secondaryColor: asString(competitor.secondary_color),
      side,
      slot: index + 1,
      liveRank: asNumber(competitor.rank ?? competitor.position),
      score,
      metadata: {
        country_code: asString(competitor.country_code),
        qualifier: side
      }
    };
  });

  const winnerId = asString(status.winner_id ?? status.winner);
  const results: NormalizedResult[] = [];
  const competitionId = asString(competition.id) ?? asString(season.competition_id) ?? asString(groups[0]?.id);
  const competitionName =
    asString(competition.name) ??
    asString(season.name) ??
    asString(groups[0]?.name);
  const competitionNames = uniqueStrings([
    competition.name,
    season.name,
    ...groups.map((group) => asString(group.name))
  ]);
  const competitionIds = uniqueStrings([
    competition.id,
    season.competition_id,
    ...groups.map((group) => asString(group.id))
  ]);
  const participantTitle =
    participants.length >= 2
      ? `${participants[0]?.displayName ?? "Home"} vs ${participants[1]?.displayName ?? "Away"}`
      : participants[0]?.displayName ?? null;
  const roundLabel =
    asString(round.name ?? stageContext.name) ??
    (asNumber(round.number) !== null ? `Round ${asNumber(round.number)}` : null);

  if (winnerId) {
    results.push({
      providerParticipantId: winnerId,
      resultStatus: normalizedStatus === "official" ? "official" : "provisional",
      resultPosition: 1
    });
  } else if (homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    const winner = participants.find((participant) =>
      participant.side === "home" ? homeScore > awayScore : participant.side === "away" ? awayScore > homeScore : false
    );

    if (winner) {
      results.push({
        providerParticipantId: winner.providerParticipantId,
        resultStatus: normalizedStatus === "official" ? "official" : "provisional",
        resultPosition: 1
      });
    }
  }

  return {
    providerEventId,
    title: asString(sportEvent.start_date) && sport === "mma"
      ? `${asString(competition.name) ?? "MMA"} • ${asString(sportEvent.start_date)}`
      : asString(sportEvent.name) ??
        participantTitle ??
        asString(sportEvent.start_time) ??
        `${competitionName ?? sport.toUpperCase()} Event`,
    sportCode: sport,
    eventType: sport === "mma" ? "fight" : "match",
    status: normalizedStatus,
    scheduledStart: asString(sportEvent.start_time ?? sportEvent.scheduled),
    venueName: asString(venue.name),
    roundLabel,
    liveClock: asString(status.clock ?? status.match_clock),
    liveState: {
      status: asString(status.status ?? status.match_status),
      home_score: homeScore,
      away_score: awayScore
    },
    competition: competitionAllowed(
      {
        ids: competitionIds,
        names: competitionNames
      },
      {
        allowed_competition_names: []
      }
    )
      ? {
          providerCompetitionId: competitionId ?? `${sport}-${competitionName ?? "default"}`,
          name: competitionName ?? `${sport.toUpperCase()} Competition`,
          shortName: asString(competition.alternative_name),
          countryCode: asString(competition.country_code),
          metadata: {
            gender: asString(competition.gender),
            season_name: asString(season.name),
            group_names: competitionNames
          }
        }
      : null,
    season: asString(season.id) || asString(season.name)
      ? {
          providerSeasonId: asString(season.id),
          name: asString(season.name) ?? `${asNumber(season.year) ?? new Date().getUTCFullYear()}`,
          year: asNumber(season.year),
          metadata: {}
        }
      : null,
    participants,
    results,
    externalPayload: entry
  };
};

const collectF1ScheduleNodes = (nodeValue: unknown, output: NormalizedEvent[], context: {
  competitionName?: string | null;
  competitionId?: string | null;
  seasonId?: string | null;
  seasonName?: string | null;
}) => {
  const node = asObject(nodeValue);
  const nodeType = (asString(node.type) ?? "").toLowerCase();
  const children = asArray<JsonObject>(node.stages ?? node.sport_events);
  const category = asObject(node.category);
  const season = asObject(node.season);
  const venue = asObject(node.venue);
  const parent = asObject(node.parent);

  const nextContext = {
    competitionName: asString(category.name ?? context.competitionName),
    competitionId: asString(category.id ?? context.competitionId),
    seasonId: asString(season.id ?? context.seasonId),
    seasonName: asString(season.name ?? context.seasonName)
  };

  if (["race", "sprint_race"].includes(nodeType) && asString(node.id)) {
    output.push({
      providerEventId: asString(node.id) as string,
      title: asString(node.description ?? node.name) ?? "Formula 1 Race",
      sportCode: "f1",
      eventType: "race",
      status: normalizeStatus(node.status, "scheduled"),
      scheduledStart: asString(node.scheduled),
      venueName: asString(venue.name),
      roundLabel: asString(parent.description ?? node.round),
      liveClock: null,
      liveState: { status: asString(node.status) },
      competition: nextContext.competitionId
        ? {
            providerCompetitionId: nextContext.competitionId,
            name: nextContext.competitionName ?? "Formula 1",
            shortName: nextContext.competitionName,
            metadata: {}
          }
        : null,
      season: nextContext.seasonId
        ? {
            providerSeasonId: nextContext.seasonId,
            name: nextContext.seasonName ?? `${new Date().getUTCFullYear()}`,
            year: new Date().getUTCFullYear(),
            metadata: {}
          }
        : null,
      participants: [],
      results: [],
      externalPayload: node
    });
  }

  for (const child of children) {
    collectF1ScheduleNodes(child, output, nextContext);
  }
};

const mapF1Summary = (payload: JsonObject): NormalizedEvent | null => {
  const stage = asObject(payload.stage ?? payload.sport_event ?? payload);
  const competitors = asArray<JsonObject>(stage.competitors ?? payload.competitors);
  const category = asObject(stage.category);
  const season = asObject(stage.season);
  const venue = asObject(stage.venue);
  const parent = asObject(stage.parent);
  const providerEventId = asString(stage.id);

  if (!providerEventId) return null;

  const normalizedStatus = normalizeStatus(stage.status ?? stage.stage_status, "scheduled");
  const participants = competitors.map<NormalizedParticipant>((competitor, index) => {
    const team = asObject(competitor.team);

    return {
      providerParticipantId: asString(competitor.id) ?? `driver-${index + 1}`,
      displayName: asString(competitor.name) ?? `Driver ${index + 1}`,
      shortName: asString(competitor.short_name),
      abbreviation: asString(competitor.abbreviation),
      participantType: "driver",
      imageUrl: asString(competitor.image_path),
      primaryColor: asString(team.primary_color ?? competitor.primary_color),
      secondaryColor: asString(team.secondary_color ?? competitor.secondary_color),
      slot: index + 1,
      liveRank: asNumber(competitor.position),
      metadata: {
        team_name: asString(team.name),
        nationality: asString(competitor.nationality)
      }
    };
  });

  const results = competitors
    .filter((competitor) => asNumber(competitor.position) !== null)
    .map<NormalizedResult>((competitor) => ({
      providerParticipantId: asString(competitor.id) as string,
      resultStatus: normalizedStatus === "official" ? "official" : "provisional",
      resultPosition: asNumber(competitor.position),
      resultCode: asString(competitor.status),
      outcomeText: asString(competitor.status),
      scoreText: asString(competitor.time ?? competitor.fastest_lap_time)
    }));

  return {
    providerEventId,
    title: asString(stage.description ?? stage.name) ?? "Formula 1 Race",
    sportCode: "f1",
    eventType: "race",
    status: normalizedStatus,
    scheduledStart: asString(stage.scheduled),
    venueName: asString(venue.name),
    roundLabel: asString(parent.description ?? stage.round),
    liveClock: asString(stage.clock),
    liveState: { status: asString(stage.status) },
    competition: asString(category.id)
      ? {
          providerCompetitionId: asString(category.id) as string,
          name: asString(category.name) ?? "Formula 1",
          shortName: asString(category.name),
          metadata: {}
        }
      : null,
    season: asString(season.id)
      ? {
          providerSeasonId: asString(season.id),
          name: asString(season.name) ?? `${new Date().getUTCFullYear()}`,
          year: asNumber(season.year),
          metadata: {}
        }
      : null,
    participants,
    results,
    externalPayload: payload
  };
};

const upsertCompetition = async (providerId: string, sport: SportCode, competition: NormalizedCompetition | null) => {
  if (!competition?.providerCompetitionId) return null;

  const { data, error } = await admin
    .from("sports_competitions")
    .upsert(
      {
        provider_id: providerId,
        sport_code: sport,
        provider_competition_id: competition.providerCompetitionId,
        name: competition.name,
        short_name: competition.shortName ?? null,
        country_code: competition.countryCode ?? null,
        config: competition.metadata ?? {}
      },
      { onConflict: "provider_id,provider_competition_id" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
};

const upsertSeason = async (competitionId: string | null, season: NormalizedSeason | null) => {
  if (!competitionId || !season?.name) return null;

  const { data, error } = await admin
    .from("sports_seasons")
    .upsert(
      {
        competition_id: competitionId,
        provider_season_id: season.providerSeasonId ?? null,
        name: season.name,
        year: season.year ?? null,
        metadata: season.metadata ?? {}
      },
      { onConflict: "competition_id,name" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
};

const upsertParticipant = async (competitionId: string | null, sport: SportCode, participant: NormalizedParticipant) => {
  const { data, error } = await admin
    .from("sports_participants")
    .upsert(
      {
        competition_id: competitionId,
        sport_code: sport,
        participant_type: participant.participantType,
        provider_participant_id: participant.providerParticipantId,
        display_name: participant.displayName,
        short_name: participant.shortName ?? null,
        abbreviation: participant.abbreviation ?? null,
        image_url: participant.imageUrl ?? null,
        primary_color: participant.primaryColor ?? null,
        secondary_color: participant.secondaryColor ?? null,
        metadata: participant.metadata ?? {}
      },
      { onConflict: "sport_code,provider_participant_id" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
};

const upsertEvent = async (providerId: string, competitionId: string | null, seasonId: string | null, event: NormalizedEvent) => {
  const { data, error } = await admin
    .from("sports_events")
    .upsert(
      {
        provider_id: providerId,
        competition_id: competitionId,
        season_id: seasonId,
        sport_code: event.sportCode,
        provider_event_id: event.providerEventId,
        event_type: event.eventType,
        title: event.title,
        scheduled_start: event.scheduledStart ?? null,
        status: event.status,
        venue_name: event.venueName ?? null,
        round_label: event.roundLabel ?? null,
        live_clock: event.liveClock ?? null,
        live_state: event.liveState ?? {},
        external_payload: event.externalPayload,
        last_synced_at: new Date().toISOString(),
        completed_at: ["completed", "official"].includes(event.status) ? new Date().toISOString() : null,
        official_at: event.status === "official" ? new Date().toISOString() : null
      },
      { onConflict: "provider_id,provider_event_id" }
    )
    .select("id,status")
    .single();

  if (error) throw error;
  return data.id as string;
};

const upsertEventParticipant = async (eventId: string, participantId: string, participant: NormalizedParticipant) => {
  const { error } = await admin.from("sports_event_participants").upsert(
    {
      event_id: eventId,
      participant_id: participantId,
      side: participant.side ?? null,
      slot: participant.slot ?? null,
      role: participant.participantType,
      score: participant.score ?? null,
      live_rank: participant.liveRank ?? null,
      metadata: participant.metadata ?? {}
    },
    { onConflict: "event_id,participant_id" }
  );

  if (error) throw error;
};

const upsertEventResult = async (
  eventId: string,
  participantId: string,
  result: NormalizedResult
) => {
  const { error } = await admin.from("sports_event_results").upsert(
    {
      event_id: eventId,
      participant_id: participantId,
      result_status: result.resultStatus,
      result_position: result.resultPosition ?? null,
      result_code: result.resultCode ?? null,
      outcome_text: result.outcomeText ?? null,
      score_text: result.scoreText ?? null,
      metadata: result.metadata ?? {}
    },
    { onConflict: "event_id,participant_id" }
  );

  if (error) throw error;
};

const persistSnapshot = async (eventId: string, snapshotKind: string, rawPayload: JsonObject, normalizedPayload: JsonObject) => {
  const { error } = await admin.from("sports_event_snapshots").insert({
    event_id: eventId,
    snapshot_kind: snapshotKind,
    raw_payload: rawPayload,
    normalized_payload: normalizedPayload
  });

  if (error) throw error;
};

const runAdminRpc = async (fn: string, args: Record<string, unknown>) => {
  const { error } = await admin.rpc(fn, args);
  if (error) {
    throw new Error(`${fn} failed for ${JSON.stringify(args)}: ${error.message}`);
  }
};

const finalizeEvent = async (eventId: string, normalized: NormalizedEvent, dryRun: boolean) => {
  if (dryRun) return;

  if (normalized.participants.length > 0) {
    await runAdminRpc("sports_generate_markets_for_event", { p_sports_event_id: eventId });
  }
  await runAdminRpc("sports_refresh_event_market_state", { p_sports_event_id: eventId });

  if (["official", "cancelled"].includes(normalized.status)) {
    await runAdminRpc("sports_settle_event_markets", { p_sports_event_id: eventId });
  }
};

const ingestEvent = async (
  providerId: string,
  sport: SportCode,
  normalized: NormalizedEvent,
  sportConfig: ProviderConfigEntry,
  dryRun: boolean,
  snapshotKind: string
) => {
  if (!competitionAllowed(
    {
      ids: [normalized.competition?.providerCompetitionId],
      names: [
        normalized.competition?.name,
        normalized.season?.name
      ]
    },
    sportConfig
  )) {
    return { skipped: true };
  }

  if (dryRun) {
    return { skipped: false, dryRun: true };
  }

  const competitionId = await upsertCompetition(providerId, sport, normalized.competition ?? null);
  const seasonId = await upsertSeason(competitionId, normalized.season ?? null);
  const eventId = await upsertEvent(providerId, competitionId, seasonId, normalized);

  const participantIds = new Map<string, string>();
  for (const participant of normalized.participants) {
    const participantId = await upsertParticipant(competitionId, sport, participant);
    participantIds.set(participant.providerParticipantId, participantId);
    await upsertEventParticipant(eventId, participantId, participant);
  }

  for (const result of normalized.results) {
    const participantId = participantIds.get(result.providerParticipantId);
    if (!participantId) continue;
    await upsertEventResult(eventId, participantId, result);
  }

  if (!dryRun) {
    await persistSnapshot(
      eventId,
      snapshotKind,
      normalized.externalPayload,
      {
        title: normalized.title,
        status: normalized.status,
        scheduled_start: normalized.scheduledStart,
        participants: normalized.participants.map((participant) => ({
          id: participant.providerParticipantId,
          side: participant.side,
          score: participant.score
        })),
        results: normalized.results
      }
    );
  }

  await finalizeEvent(eventId, normalized, dryRun);
  return { skipped: false, eventId };
};

const runScheduleSync = async (
  providerId: string,
  config: ProviderConfig,
  sport: SportCode,
  payload: SyncPayload,
  tracker: RequestTracker,
  dryRun: boolean
) => {
  const sportConfig = config.sports?.[sport] ?? {};
  const runId = await createRun(providerId, sport, "schedule", { mode: payload.mode ?? "full" });
  const requestStart = tracker.count;
  let written = 0;

  try {
    if (sport === "f1") {
      const seasonsPayload = await tracker.fetchJson(buildF1SeasonsUrl(config));
      const preferredSeasonId =
        sportConfig.current_season_id ??
        sportConfig.resolved_season_id ??
        null;
      const resolvedSeason = findCurrentF1Season(seasonsPayload, preferredSeasonId);
      const seasonId = resolvedSeason?.id ?? null;

      if (!seasonId) {
        await finishRun(runId, "partial", tracker.count - requestStart, written, "No Formula 1 season id found");
        return { written };
      }

      if (!dryRun && resolvedSeason) {
        await persistResolvedF1Season(providerId, config, sportConfig, resolvedSeason);
      }

      const schedulePayload = await tracker.fetchJson(buildF1StageScheduleUrl(config, seasonId));
      const normalizedEvents: NormalizedEvent[] = [];
      const roots = asArray<JsonObject>(schedulePayload.stages ?? schedulePayload.sport_events);
      for (const root of roots) {
        collectF1ScheduleNodes(root, normalizedEvents, {});
      }

      const hydratedEvents = await hydrateF1ScheduleWithSummaries(
        normalizedEvents,
        config,
        sportConfig,
        tracker
      );

      for (const normalized of hydratedEvents) {
        const result = await ingestEvent(providerId, sport, normalized, sportConfig, dryRun, "schedule");
        if (!result.skipped) written += 1;
      }
    } else {
      const baseDate = payload.date ? new Date(`${payload.date}T00:00:00Z`) : new Date();
      const daysBack = payload.daysBack ?? sportConfig.schedule_days_back ?? config.request_budget?.schedule_days_back ?? 1;
      const daysAhead = payload.daysAhead ?? sportConfig.schedule_days_ahead ?? config.request_budget?.schedule_days_ahead ?? 5;

      for (let offset = -daysBack; offset <= daysAhead; offset += 1) {
        const date = isoDate(addDays(baseDate, offset));
        const url = buildSummaryUrl(sport, config, sportConfig, "daily", date);
        if (!url) continue;

        const response = await tracker.fetchJson(url);
        const entries = asArray(response.summaries);
        for (const entry of entries) {
          const normalized = mapTeamSummary(sport as Exclude<SportCode, "f1">, entry);
          if (!normalized) continue;
          const result = await ingestEvent(providerId, sport, normalized, sportConfig, dryRun, "daily_summary");
          if (!result.skipped) written += 1;
        }
      }
    }

    await finishRun(runId, "completed", tracker.count - requestStart, written);
    return { written };
  } catch (error) {
    await finishRun(
      runId,
      "failed",
      tracker.count - requestStart,
      written,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

const runLiveSync = async (
  providerId: string,
  config: ProviderConfig,
  sport: SportCode,
  payload: SyncPayload,
  tracker: RequestTracker,
  dryRun: boolean
) => {
  const sportConfig = config.sports?.[sport] ?? {};
  const runId = await createRun(providerId, sport, "live", { mode: payload.mode ?? "full" });
  const requestStart = tracker.count;
  let written = 0;

  try {
    if (sport === "f1") {
      const lookback = addDays(new Date(), -2).toISOString();
      const lookahead = addDays(new Date(), 5).toISOString();
      const { data: events, error } = await admin
        .from("sports_events")
        .select("provider_event_id")
        .eq("sport_code", "f1")
        .gte("scheduled_start", lookback)
        .lte("scheduled_start", lookahead)
        .order("scheduled_start", { ascending: true })
        .limit(sportConfig.live_detail_cap ?? config.request_budget?.live_detail_cap ?? 2);

      if (error) throw error;

      for (const row of events ?? []) {
        const stageId = asString(row.provider_event_id);
        if (!stageId) continue;

        const payloadSummary = await tracker.fetchJson(buildF1StageSummaryUrl(config, stageId));
        const normalized = mapF1Summary(payloadSummary);
        if (!normalized) continue;
        const result = await ingestEvent(providerId, sport, normalized, sportConfig, dryRun, "f1_summary");
        if (!result.skipped) written += 1;
      }
    } else {
      const url = buildSummaryUrl(sport, config, sportConfig, "live");
      if (url) {
        const response = await tracker.fetchJson(url);
        const entries = asArray(response.summaries);
        for (const entry of entries) {
          const normalized = mapTeamSummary(sport as Exclude<SportCode, "f1">, entry);
          if (!normalized) continue;
          const result = await ingestEvent(providerId, sport, normalized, sportConfig, dryRun, "live_summary");
          if (!result.skipped) written += 1;
        }
      }
    }

    await finishRun(runId, "completed", tracker.count - requestStart, written);
    return { written };
  } catch (error) {
    await finishRun(
      runId,
      "failed",
      tracker.count - requestStart,
      written,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

const runSettlementSweep = async (providerId: string, sport: SportCode) => {
  const runId = await createRun(providerId, sport, "settlement", { source: "sweep" });
  let written = 0;

  try {
    const cutoff = addDays(new Date(), -7).toISOString();
    const { data: events, error } = await admin
      .from("sports_events")
      .select("id")
      .eq("sport_code", sport)
      .in("status", ["official", "cancelled"])
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) throw error;

    for (const row of events ?? []) {
      const eventId = asString(row.id);
      if (!eventId) continue;
      await runAdminRpc("sports_settle_event_markets", { p_sports_event_id: eventId });
      written += 1;
    }

    await finishRun(runId, "completed", 0, written);
    return { written };
  } catch (error) {
    await finishRun(runId, "failed", 0, written, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    await ensureAuthorized(request);

    const payload = await getPayload(request);
    const provider = await loadProvider();
    const usage = await getRecentUsage(provider.id);
    const budgetLimit = provider.config.request_budget?.soft_monthly_limit ?? provider.quotaLimit;
    const remaining = Math.max(0, budgetLimit - usage);

    if (remaining <= 0) {
      return json(
        {
          error: "Sportradar request budget exhausted",
          usage,
          limit: budgetLimit
        },
        429
      );
    }

    const mode = payload.mode ?? "full";
    const requestedSports = (payload.sports?.length ? payload.sports : DEFAULT_SYNC_SPORTS).filter((sport) => {
      const configEntry = provider.config.sports?.[sport];
      return configEntry?.enabled !== false;
    });

    const perRunCap = Math.min(
      provider.config.request_budget?.per_run_request_cap ?? 24,
      remaining
    );
    const tracker = new RequestTracker(perRunCap, `sportradar-${mode}`);
    const dryRun = payload.dryRun === true;
    const results: Record<string, unknown> = {};

    for (const sport of requestedSports) {
      const sportResult: Record<string, unknown> = {};

      if (mode === "schedule" || mode === "full") {
        sportResult.schedule = await runScheduleSync(provider.id, provider.config, sport, payload, tracker, dryRun);
      }

      if (mode === "live" || mode === "full") {
        sportResult.live = await runLiveSync(provider.id, provider.config, sport, payload, tracker, dryRun);
      }

      if (mode === "settlement" || mode === "full") {
        sportResult.settlement = await runSettlementSweep(provider.id, sport);
      }

      results[sport] = sportResult;
    }

    return json({
      ok: true,
      provider: "sportradar",
      mode,
      dryRun,
      requestCount: tracker.count,
      remainingAfterRun: Math.max(0, remaining - tracker.count),
      sports: results
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
});
