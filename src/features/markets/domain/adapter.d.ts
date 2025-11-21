import type { EventWithMarkets, PoolPricingRow } from "@domains/betting/api/bettingApi";
import type { Pool } from "../types";
export interface MarketDetailData {
    market: {
        id: string;
        name: string;
        status: string;
        description?: string | null;
        total_pool?: number | null;
        rake_percent?: number | null;
        close_time?: string | null;
        updated_at?: string | null;
        settled_at?: string | null;
        event?: {
            title?: string | null;
            takeout?: number | null;
        } | null;
    };
    outcomes: Array<{
        id: string;
        label: string;
        pool?: number | null;
        driverName?: string | null;
        teamColor?: string | null;
        numBets?: number;
        baselineOdds?: number | null;
        color?: string | null;
    }>;
}
export declare const mapEventWithMarketsToUiPools: (events: EventWithMarkets[]) => Pool[];
export declare const mapPricingRowsToPools: (rows: PoolPricingRow[]) => Pool[];
export declare const mapPricingRowsToPool: (rows: PoolPricingRow[]) => Pool | null;
export declare const mapMarketDetailToUiPool: (detail: MarketDetailData | null) => Pool | null;
