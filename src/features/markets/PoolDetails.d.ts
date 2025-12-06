import type { LiveBet, Pool } from "./types";
interface PoolDetailsProps {
    pool: Pool;
    liveBets: LiveBet[];
    onOutcomeSelect?: (outcomeId: string) => void;
    onOpenBetSlip?: (poolId: string, outcomeId: string) => void;
}
export declare function PoolDetails({ pool, liveBets, onOutcomeSelect, onOpenBetSlip }: PoolDetailsProps): import("react/jsx-runtime").JSX.Element;
export {};
