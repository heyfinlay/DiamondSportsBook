import { marketKeys, walletKeys } from "./keys";
export const refetchAfterBet = (queryClient, options) => {
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
