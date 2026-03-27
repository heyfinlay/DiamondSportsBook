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
export declare const fetchSportsBoardEvents: (options?: number | FetchSportsBoardOptions) => Promise<SportsBoardEvent[]>;
export declare const fetchSportsEventDetail: (eventId: string, options?: {
    includeUnpublished?: boolean;
}) => Promise<SportsBoardEvent | null>;
export declare const fetchSportsProviderHealth: () => Promise<SportsProviderHealthRow[]>;
export declare const triggerSportsSync: (request: SportsSyncRequest) => Promise<SportsSyncResponse>;
export declare const publishSportsEvent: (eventId: string) => Promise<any>;
export declare const unpublishSportsEvent: (eventId: string) => Promise<any>;
