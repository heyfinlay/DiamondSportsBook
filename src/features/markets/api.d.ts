import type { LiveBet, Pool } from "./types";
export declare const fetchUiPools: () => Promise<Pool[]>;
export declare const fetchUiPoolById: (poolId: string) => Promise<Pool | null>;
export declare const fetchUiLiveBetsForPool: (poolId: string) => Promise<LiveBet[]>;
