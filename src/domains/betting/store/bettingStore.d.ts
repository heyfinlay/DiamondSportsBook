export interface OutcomeQuote {
    id: string;
    label: string;
    baselineOdds: number;
    impliedProbability: number;
    poolShare: number;
}
export interface WagerPreview {
    baselineOdds: number;
    effectiveOdds: number;
    priceImpact: number;
    impliedProbability: number;
    estimatedPayout: number;
}
interface BetslipState {
    isOpen: boolean;
    marketId: string | null;
    marketName: string | null;
    eventTitle: string | null;
    outcomeId: string | null;
    outcomeLabel: string | null;
    minStake: number;
    maxStake: number;
    stake: number;
    preview: WagerPreview | null;
}
interface BettingState {
    markets: Array<{
        id: string;
        name: string;
        eventId: string;
        status: "open" | "suspended" | "closed" | "settled";
        totalPool: number;
    }>;
    outcomesByMarket: Record<string, OutcomeQuote[]>;
    betslip: BetslipState;
    upsertMarket: (market: BettingState["markets"][number]) => void;
    setMarkets: (markets: BettingState["markets"]) => void;
    setOutcomes: (marketId: string, outcomes: OutcomeQuote[]) => void;
    openBetslip: (selection: Omit<BetslipState, "isOpen" | "stake" | "preview"> & {
        stake?: number;
    }) => void;
    setBetslipSelection: (selection: Omit<BetslipState, "isOpen" | "preview"> & {
        stake?: number;
    }) => void;
    closeBetslip: () => void;
    setStake: (value: number) => void;
    setPreviewData: (preview: WagerPreview | null) => void;
}
export declare const useBettingStore: import("zustand").UseBoundStore<Omit<Omit<import("zustand").StoreApi<BettingState>, "setState"> & {
    setState<A extends string | {
        type: string;
    }>(partial: BettingState | Partial<BettingState> | ((state: BettingState) => BettingState | Partial<BettingState>), replace?: boolean, action?: A): void;
}, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: BettingState, previousSelectedState: BettingState) => void): () => void;
        <U>(selector: (state: BettingState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }): () => void;
    };
}>;
export {};
