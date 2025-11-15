import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
export const useBettingStore = create()(devtools(subscribeWithSelector((set) => ({
    markets: [],
    outcomesByMarket: {},
    upsertMarket: (market) => set((state) => {
        const next = state.markets.filter((m) => m.id !== market.id);
        next.push(market);
        return { markets: next };
    }),
    setMarkets: (markets) => set({ markets }),
    setOutcomes: (marketId, outcomes) => set((state) => ({
        outcomesByMarket: {
            ...state.outcomesByMarket,
            [marketId]: outcomes
        }
    }))
})), { name: "betting-store" }));
