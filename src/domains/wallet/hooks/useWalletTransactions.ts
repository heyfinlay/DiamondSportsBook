import { useQuery } from "@tanstack/react-query";
import { fetchWalletTransactions } from "../api/walletApi";
import { walletKeys } from "@lib/query/keys";

export const useWalletTransactions = (userId?: string) => {
  return useQuery({
    queryKey: walletKeys.transactions(userId),
    queryFn: () => fetchWalletTransactions(userId!),
    enabled: !!userId
  });
};
