import type { PoolStatus } from "../../features/markets/types";
import { type OutcomeTileProps } from "./OutcomeTile";
export interface MarketCardOutcome extends OutcomeTileProps {
    id: string;
}
export interface MarketCardProps {
    id: string;
    name: string;
    closeTimeLabel?: string;
    status?: PoolStatus;
    totalPool: number;
    commission: number;
    outcomes: MarketCardOutcome[];
    selectedOutcomeId?: string | null;
    onSelectOutcome?: (outcomeId: string) => void;
    onViewDetails?: (marketId: string) => void;
    actionLabel?: string;
    subtitle?: string;
}
export declare function MarketCard({ id, name, closeTimeLabel, status, totalPool, commission, outcomes, selectedOutcomeId, onSelectOutcome, onViewDetails, actionLabel, subtitle }: MarketCardProps): import("react/jsx-runtime").JSX.Element;
