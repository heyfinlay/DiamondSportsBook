import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

export interface OutcomeQuote {
  id: string;
  label: string;
  baselineOdds: number;
  impliedProbability: number;
  poolShare: number;
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
  upsertMarket: (market: BettingState["markets"][number]) => void;
  setMarkets: (markets: BettingState["markets"]) => void;
  setOutcomes: (marketId: string, outcomes: OutcomeQuote[]) => void;
}

export const useBettingStore = create<BettingState>()(
  devtools(
    subscribeWithSelector((set) => ({
      markets: [],
      outcomesByMarket: {},
      upsertMarket: (market) =>
        set((state) => {
          const next = state.markets.filter((m) => m.id !== market.id);
          next.push(market);
          return { markets: next };
        }),
      setMarkets: (markets) => set({ markets }),
      setOutcomes: (marketId, outcomes) =>
        set((state) => ({
          outcomesByMarket: {
            ...state.outcomesByMarket,
            [marketId]: outcomes
          }
        }))
    })),
    { name: "betting-store" }
  )
);
