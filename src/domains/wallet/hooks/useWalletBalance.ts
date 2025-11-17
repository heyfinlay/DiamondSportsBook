import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWalletSummary } from "../api/walletApi";
import { useWalletStore } from "../store/walletStore";

export const useWalletBalance = (userId?: string) => {
  const setBalance = useWalletStore((state) => state.setBalance);

  const query = useQuery({
    queryKey: ["wallet-balance", userId],
    queryFn: () => fetchWalletSummary(userId!),
    enabled: !!userId
  });

  useEffect(() => {
    if (query.data) {
      setBalance(query.data.balance);
    }
  }, [query.data, setBalance]);

  return query;
};
