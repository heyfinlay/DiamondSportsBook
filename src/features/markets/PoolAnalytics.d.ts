import type { LiveBet, Pool } from "./types";
interface PoolAnalyticsProps {
    pool: Pool;
    liveBets: LiveBet[];
}
export declare function PoolAnalytics({ pool, liveBets }: PoolAnalyticsProps): import("react/jsx-runtime").JSX.Element;
export default PoolAnalytics;
