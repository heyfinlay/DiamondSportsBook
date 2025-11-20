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
        }>;
    }>;
}
export declare const fetchMarkets: () => Promise<{
    id: any;
    name: any;
    description: any;
    status: any;
    total_pool: number;
    event: {
        id: any;
        title: any;
        takeout: number;
    };
}[]>;
export declare const fetchMarketEvents: () => Promise<EventWithMarkets[]>;
export declare const fetchArchivedMarketEvents: () => Promise<EventWithMarkets[]>;
export interface OutcomeQuote {
    id: string;
    label: string;
    pool: number;
}
export declare const fetchMarketDetail: (marketId: string) => Promise<{
    market: {
        id: any;
        name: any;
        description: any;
        status: any;
        pool_type: any;
        rake_percent: number;
        total_pool: number;
        min_stake: number;
        max_stake: number;
        event: any;
    };
    outcomes: {
        id: any;
        label: any;
        pool: number;
        color: any;
    }[];
}>;
export declare const previewWager: (marketId: string, outcomeId: string, stake: number) => Promise<{
    baselineOdds: number;
    effectiveOdds: number;
    priceImpact: number;
    impliedProbability: number;
    estimatedPayout: number;
}>;
export declare const placeWager: (marketId: string, outcomeId: string, stake: number, idempotencyKey?: string) => Promise<any>;
export interface UserWager {
    id: string;
    stake: number;
    status: string;
    effective_odds: number;
    created_at: string;
    outcome_label: string;
    market_name: string;
    market_type: string;
    event_title: string;
}
export declare const fetchUserWagers: (userId: string, limit?: number) => Promise<UserWager[]>;
