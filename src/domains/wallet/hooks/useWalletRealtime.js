import { useEffect } from "react";
import { subscribeToChannel } from "@lib/realtime";
import { supabase } from "@lib/supabaseClient";
import { useWalletStore } from "../store/walletStore";
export const useWalletRealtime = (walletAccountId) => {
    const setBalance = useWalletStore((state) => state.setBalance);
    const setTransactions = useWalletStore((state) => state.setTransactions);
    useEffect(() => {
        if (!walletAccountId)
            return;
        const channel = subscribeToChannel(`wallet-${walletAccountId}`, {
            config: { broadcast: { ack: true } }
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions", filter: `account_id=eq.${walletAccountId}` }, async () => {
            const { data, error } = await supabase
                .from("wallet_transactions_view")
                .select("*")
                .eq("account_id", walletAccountId)
                .order("created_at", { ascending: false })
                .limit(50);
            if (error) {
                console.error(error);
                return;
            }
            setTransactions(data?.map((row) => ({
                id: row.id,
                amount: row.amount,
                kind: row.kind,
                createdAt: row.created_at
            })) ?? []);
            setBalance(data?.reduce((total, row) => total + row.amount, 0) ?? 0);
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [walletAccountId, setBalance, setTransactions]);
};
