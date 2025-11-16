import { useEffect } from "react";
import { supabase } from "@lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";

export const useWalletRealtime = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setup = async () => {
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      const accountId = data?.id;
      if (!accountId || cancelled) return;

      const invalidateUserQueries = () => {
        queryClient.invalidateQueries({ queryKey: ["wallet-balance", userId] });
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions", userId] });
        queryClient.invalidateQueries({ queryKey: ["admin-wallet-audit"] });
        queryClient.invalidateQueries({ queryKey: ["user-deposits", userId] });
        queryClient.invalidateQueries({ queryKey: ["user-withdrawals", userId] });
      };

      activeChannel = supabase
        .channel(`wallet-${accountId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wallet_transactions", filter: `account_id=eq.${accountId}` },
          invalidateUserQueries
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "deposits", filter: `account_id=eq.${accountId}` },
          invalidateUserQueries
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "withdrawals", filter: `account_id=eq.${accountId}` },
          invalidateUserQueries
        )
        .subscribe();
    };

    setup();

    return () => {
      cancelled = true;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [queryClient, userId]);
};
