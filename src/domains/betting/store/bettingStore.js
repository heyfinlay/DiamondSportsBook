import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
const initialBetslipState = {
    isOpen: false,
    marketId: null,
    marketName: null,
    eventTitle: null,
    outcomeId: null,
    outcomeLabel: null,
    minStake: 0,
    maxStake: 0,
    stake: 0,
    preview: null
};
export const useBettingStore = create()(devtools(subscribeWithSelector((set) => ({
    markets: [],
    outcomesByMarket: {},
    betslip: initialBetslipState,
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
    })),
    openBetslip: (selection) => set(() => ({
        betslip: {
            ...initialBetslipState,
            ...selection,
            isOpen: true,
            stake: selection.stake ?? Math.max(selection.minStake, 0)
        }
    })),
    closeBetslip: () => set(() => ({ betslip: initialBetslipState })),
    setStake: (value) => set((state) => ({
        betslip: {
            ...state.betslip,
            stake: value
        }
    })),
    setPreviewData: (preview) => set((state) => ({
        betslip: {
            ...state.betslip,
            preview
        }
    }))
})), { name: "betting-store" }));
