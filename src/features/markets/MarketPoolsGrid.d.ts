import type { Pool } from "./types";
interface MarketPoolsGridProps {
    pools: Pool[];
    onSelectPool?: (poolId: string) => void;
}
export declare function MarketPoolsGrid({ pools, onSelectPool }: MarketPoolsGridProps): import("react/jsx-runtime").JSX.Element;
export {};
