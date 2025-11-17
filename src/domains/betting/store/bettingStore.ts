import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

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
  openBetslip: (selection: Omit<BetslipState, "isOpen" | "stake" | "preview"> & { stake?: number }) => void;
  closeBetslip: () => void;
  setStake: (value: number) => void;
  setPreviewData: (preview: WagerPreview | null) => void;
}

const initialBetslipState: BetslipState = {
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

export const useBettingStore = create<BettingState>()(
  devtools(
    subscribeWithSelector((set) => ({
      markets: [],
      outcomesByMarket: {},
      betslip: initialBetslipState,
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
        })),
      openBetslip: (selection) =>
        set(() => ({
          betslip: {
            ...initialBetslipState,
            ...selection,
            isOpen: true,
            stake: selection.stake ?? Math.max(selection.minStake, 0)
          }
        })),
      closeBetslip: () => set(() => ({ betslip: initialBetslipState })),
      setStake: (value) =>
        set((state) => ({
          betslip: {
            ...state.betslip,
            stake: value
          }
        })),
      setPreviewData: (preview) =>
        set((state) => ({
          betslip: {
            ...state.betslip,
            preview
          }
        }))
    })),
    { name: "betting-store" }
  )
);
