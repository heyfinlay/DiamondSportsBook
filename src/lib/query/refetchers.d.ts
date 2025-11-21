import type { QueryClient } from "@tanstack/react-query";
interface AfterBetOptions {
    userId?: string | null;
    marketId?: string | null;
}
export declare const refetchAfterBet: (queryClient: QueryClient, options: AfterBetOptions) => void;
export {};
