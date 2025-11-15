export interface MarketSummary {
    id: string;
    name: string;
    description: string | null;
    status: string;
    total_pool: number;
    event: {
        id: string;
        title: string;
        takeout: number;
    };
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
        total_pool: number;
        min_stake: number;
        max_stake: number;
        event: any;
    };
    outcomes: {
        id: any;
        label: any;
        pool: number;
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
