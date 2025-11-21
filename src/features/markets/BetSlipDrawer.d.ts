import type { Outcome, Pool } from "./types";
interface BetSlipDrawerProps {
    isOpen: boolean;
    pool: Pool | null;
    outcomes: Outcome[];
    selectedOutcomeId: string | null;
    onClose: () => void;
    onSelectOutcome: (outcomeId: string) => void;
    onPlaceBet?: (params: {
        poolId: string;
        outcomeId: string;
        stake: number;
    }) => void;
}
export declare function BetSlipDrawer({ isOpen, pool, outcomes, selectedOutcomeId, onClose, onSelectOutcome, onPlaceBet }: BetSlipDrawerProps): import("react/jsx-runtime").JSX.Element;
export {};
