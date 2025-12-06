import type { Pool } from "./types";
interface MarketPoolsGridProps {
    pools: Pool[];
    onSelectPool?: (poolId: string) => void;
    onSelectOutcome?: (poolId: string, poolTitle: string, outcome: Pool["outcomes"][number]) => void;
}
export declare function MarketPoolsGrid({ pools, onSelectPool, onSelectOutcome }: MarketPoolsGridProps): import("react/jsx-runtime").JSX.Element;
export {};
