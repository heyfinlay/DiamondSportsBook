import type { QueryClient } from "@tanstack/react-query";
import { marketKeys, walletKeys } from "./keys";

interface AfterBetOptions {
  userId?: string | null;
  marketId?: string | null;
}

export const refetchAfterBet = (queryClient: QueryClient, options: AfterBetOptions) => {
  if (options.userId) {
    queryClient.invalidateQueries({ queryKey: walletKeys.balance(options.userId), exact: false });
    queryClient.invalidateQueries({
      queryKey: walletKeys.transactions(options.userId),
      exact: false
    });
  }

  queryClient.invalidateQueries({ queryKey: marketKeys.pools() });

  if (options.marketId) {
    queryClient.invalidateQueries({ queryKey: marketKeys.pool(options.marketId) });
    queryClient.invalidateQueries({ queryKey: marketKeys.liveBets(options.marketId) });
  }
};
