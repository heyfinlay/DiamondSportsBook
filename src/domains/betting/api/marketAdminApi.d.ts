export type MarketContainerStatus = "draft" | "upcoming" | "active" | "in_settlement" | "settled" | "archived";
export type PoolStatus = "draft" | "open" | "suspended" | "closed" | "settlement_proposed" | "settled" | "void";
export interface MarketPool {
    id: string;
    name: string;
    label: string;
    description: string | null;
    status: PoolStatus;
    archived?: boolean;
    settled_at?: string | null;
    archived_at?: string | null;
    pool_type: PoolType;
    rake_percent: number;
    total_pool: number;
    min_stake: number;
    max_stake: number;
    close_time: string | null;
    config: Record<string, unknown>;
    settlement_payload: Record<string, unknown> | null;
    pending_settlement?: {
        pool_id: string;
        status: string;
        winning_outcome_id: string | null;
        summary: Record<string, unknown> | null;
    } | null;
    outcomes: Array<{
        id: string;
        label: string;
        pool: number;
        color: string | null;
        driver_id: string | null;
        participant_type?: ParticipantType;
        participant_id?: string | null;
        metadata?: Record<string, unknown> | null;
    }>;
}
export type MarketScope = "qualifying" | "race";
export type MarketType = "WINNER_FULL_FIELD" | "PODIUM_FULL_FIELD" | "POSITION_BRACKET" | "HEAD_TO_HEAD" | "YES_NO_PROP" | "TEAM_POINTS" | "NUMERIC_RANGE";
export type PoolType = "winner" | "default" | "h2h" | "yes_no" | "range";
export type ParticipantType = "driver" | "team" | "boolean" | "custom";
export interface MarketContainer {
    id: string;
    title: string;
    description: string | null;
    market_type: MarketType;
    scope: MarketScope;
    config: Record<string, unknown>;
    status: MarketContainerStatus;
    starts_at: string | null;
    takeout: number;
    session: {
        id: string;
        name: string;
        track_name: string | null;
        mode: string | null;
        starts_at: string | null;
    } | null;
    markets: MarketPool[];
}
export declare const fetchAdminMarkets: () => Promise<MarketContainer[]>;
export declare const fetchAdminMarketDetail: (marketId: string) => Promise<MarketContainer>;
export interface MarketWizardPoolInput {
    name: string;
    description?: string;
    pool_type?: string;
    rake_percent?: number;
    min_stake?: number;
    max_stake?: number;
    close_time?: string;
}
export interface MarketWizardPayload {
    sessionId: string;
    title: string;
    description?: string;
    takeout?: number;
    startsAt?: string;
    pools: MarketWizardPoolInput[];
}
export declare const createMarketWizard: (payload: MarketWizardPayload) => Promise<any>;
export interface MarketBuilderRunnerInput {
    label: string;
    participant_type?: ParticipantType;
    participant_id?: string | null;
    color?: string | null;
    metadata?: Record<string, unknown>;
    baseline_odds?: number | string | null;
    range_start?: number | string | null;
    range_end?: number | string | null;
}
export interface MarketBuilderPoolInput {
    name: string;
    label?: string;
    description?: string;
    pool_type?: PoolType | string;
    rake_percent?: number;
    min_stake?: number;
    max_stake?: number;
    close_time?: string;
    config?: Record<string, unknown>;
    runners?: MarketBuilderRunnerInput[];
}
export interface MarketBuilderPayload {
    sessionId: string;
    title: string;
    marketType: MarketType;
    scope: MarketScope;
    description?: string;
    takeout?: number;
    startsAt?: string;
    config?: Record<string, unknown>;
    pools: MarketBuilderPoolInput[];
}
export declare const createMarketBuilder: (payload: MarketBuilderPayload) => Promise<any>;
export interface SessionDriver {
    id: string;
    name: string;
    number: number | null;
    team_name: string | null;
    primary_color: string | null;
    secondary_color: string | null;
}
export declare const fetchSessionDrivers: (sessionId: string) => Promise<SessionDriver[]>;
export interface ChampionshipTeam {
    id: string;
    name: string;
    primary_color: string | null;
    secondary_color: string | null;
}
export declare const fetchChampionshipTeams: () => Promise<ChampionshipTeam[]>;
export declare const openPool: (poolId: string) => Promise<any>;
export declare const closePool: (poolId: string) => Promise<any>;
export declare const suspendPool: (poolId: string) => Promise<any>;
export declare const voidPool: (poolId: string, reason?: string) => Promise<any>;
export declare const archivePool: (poolId: string) => Promise<any>;
export declare const restorePool: (poolId: string) => Promise<any>;
export interface SettlementPreview {
    pool_id: string;
    market_id: string;
    outcome_id: string;
    outcome_label: string;
    handle: number;
    rake_percent: number;
    rake_amount: number;
    distribution_pool: number;
    payout_per_unit: number;
    winners: Array<{
        wager_id: string;
        user_id: string;
        stake: number;
        payout: number;
    }>;
}
export declare const previewSettlement: (poolId: string, outcomeId: string) => Promise<SettlementPreview>;
export declare const proposeSettlement: (poolId: string, outcomeId: string) => Promise<any>;
export declare const confirmSettlement: (poolId: string) => Promise<any>;
export interface AdminWagerRow {
    wager_id: string;
    pool_id: string;
    pool_name: string;
    outcome_id: string;
    outcome_label: string;
    user_id: string;
    user_name: string | null;
    stake: number;
    status: string;
    created_at: string;
}
export declare const fetchMarketWagers: (marketId: string, poolId?: string) => Promise<AdminWagerRow[]>;
export interface WalletActivityRow {
    id: string;
    amount: number;
    kind: string;
    user_id: string;
    meta: Record<string, unknown>;
    created_at: string;
}
export declare const fetchWalletActivityForMarket: (marketId: string, poolId?: string) => Promise<WalletActivityRow[]>;
export interface RakeLedgerEntry {
    id: string;
    amount: number;
    meta: Record<string, unknown>;
    created_at: string;
    pool_id: string;
}
export declare const fetchRakeLedger: (marketId: string) => Promise<RakeLedgerEntry[]>;
export interface UpdatePoolCopyPayload {
    name?: string;
    description?: string | null;
    label?: string | null;
}
export declare const updatePoolCopy: (poolId: string, updates: UpdatePoolCopyPayload) => Promise<void>;
