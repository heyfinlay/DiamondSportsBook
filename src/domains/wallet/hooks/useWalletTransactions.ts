import { useQuery } from "@tanstack/react-query";
import { fetchWalletTransactions } from "../api/walletApi";

export const useWalletTransactions = (userId?: string) => {
  return useQuery({
    queryKey: ["wallet-transactions", userId],
    queryFn: () => fetchWalletTransactions(userId!),
    enabled: !!userId
  });
};
