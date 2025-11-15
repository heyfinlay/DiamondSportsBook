import { useQuery } from "@tanstack/react-query";
import { fetchWalletSummary } from "../api/walletApi";

export const useWalletBalance = (userId?: string) => {
  return useQuery({
    queryKey: ["wallet-balance", userId],
    queryFn: () => fetchWalletSummary(userId!),
    enabled: !!userId
  });
};
