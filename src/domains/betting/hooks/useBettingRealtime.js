import { useEffect } from "react";
import { subscribeToChannel } from "@lib/realtime";
import { supabase } from "@lib/supabaseClient";
import { useBettingStore } from "../store/bettingStore";
import { useQueryClient } from "@tanstack/react-query";
export const useBettingRealtime = (marketId) => {
    const setOutcomes = useBettingStore((state) => state.setOutcomes);
    const upsertMarket = useBettingStore((state) => state.upsertMarket);
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!marketId)
            return;
        const channel = subscribeToChannel(`market-${marketId}`, {
            config: { broadcast: { ack: true } }
        })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "markets", filter: `id=eq.${marketId}` }, (payload) => {
            upsertMarket({
                id: payload.new.id,
                name: payload.new.name,
                eventId: payload.new.event_id,
                status: payload.new.status,
                totalPool: payload.new.total_pool
            });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "outcomes", filter: `market_id=eq.${marketId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["market-detail", marketId] });
        })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "wagers", filter: `market_id=eq.${marketId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ["wager-history", marketId] });
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [marketId, setOutcomes, upsertMarket, queryClient]);
};
