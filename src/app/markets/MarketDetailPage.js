import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { placeWager } from "@domains/betting/api/bettingApi";
import { useBettingRealtime } from "@domains/betting/hooks/useBettingRealtime";
import { BetSlipDrawer } from "../../features/markets/BetSlipDrawer";
import { PoolAnalytics } from "../../features/markets/PoolAnalytics";
import { PoolDetails } from "../../features/markets/PoolDetails";
import { fetchUiLiveBetsForPool, fetchUiPoolById } from "../../features/markets/api";
import { USE_MARKET_LAYOUT_V2 } from "../../features/markets/flags";
import { formatCurrency } from "../../features/markets/utils/format";
// v2 Markets detail page: maps v1 pool/outcome totals into the new UI components.
const MarketDetailPage = () => {
    const { marketId } = useParams();
    const queryClient = useQueryClient();
    const [betSlipOpen, setBetSlipOpen] = useState(false);
    const [selectedOutcomeId, setSelectedOutcomeId] = useState(null);
    useBettingRealtime(marketId);
    const poolQuery = useQuery({
        queryKey: ["markets:v2-pool", marketId],
        queryFn: () => fetchUiPoolById(marketId),
        enabled: !!marketId
    });
    const liveBetsQuery = useQuery({
        queryKey: ["markets:v2-live-bets", marketId],
        queryFn: () => fetchUiLiveBetsForPool(marketId),
        enabled: !!marketId
    });
    const placeBetMutation = useMutation({
        mutationFn: ({ poolId, outcomeId, stake }) => placeWager(poolId, outcomeId, stake, crypto.randomUUID()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["markets:v2-pool", marketId] });
            queryClient.invalidateQueries({ queryKey: ["markets:v2-live-bets", marketId] });
            setBetSlipOpen(false);
        }
    });
    const pool = poolQuery.data ?? null;
    if (!marketId) {
        return _jsx("p", { className: "text-white/70", children: "Market not found." });
    }
    if (poolQuery.isLoading) {
        return _jsx("p", { className: "text-sm text-neutral-400", children: "Loading market\u2026" });
    }
    if (!pool) {
        return _jsx("p", { className: "text-sm text-neutral-400", children: "Pool not available." });
    }
    const handleOutcomeSelect = (outcomeId) => {
        setSelectedOutcomeId(outcomeId);
    };
    const handleOpenBetSlip = (poolId, outcomeId) => {
        setSelectedOutcomeId(outcomeId);
        setBetSlipOpen(true);
    };
    const headerContent = USE_MARKET_LAYOUT_V2 ? (_jsxs("header", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Market" }), _jsx("h1", { className: "mt-2 text-3xl font-semibold text-white", children: pool.title }), _jsx("p", { className: "text-sm text-white/60", children: pool.timeRemainingLabel }), _jsxs("p", { className: "text-xs text-white/40", children: ["Updated ", pool.lastUpdatedLabel] })] })) : (_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Pool" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: pool.title }), _jsx("p", { className: "text-sm text-white/60", children: pool.timeRemainingLabel })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Total Pool" }), _jsx("p", { className: "text-2xl font-semibold text-white", children: formatCurrency(pool.totalStake) }), _jsxs("p", { className: "text-xs text-white/50", children: ["Rake ", pool.rakePercent.toFixed(1), "%"] })] })] }));
    return (_jsxs("div", { className: "space-y-8", children: [headerContent, _jsxs("section", { className: "flex flex-col gap-6", children: [_jsx(PoolDetails, { pool: pool, liveBets: liveBetsQuery.data ?? [], onOutcomeSelect: handleOutcomeSelect, onOpenBetSlip: handleOpenBetSlip }), _jsx(PoolAnalytics, { pool: pool, liveBets: liveBetsQuery.data ?? [] })] }), _jsx(BetSlipDrawer, { isOpen: betSlipOpen, pool: pool, outcomes: pool.outcomes, selectedOutcomeId: selectedOutcomeId, onClose: () => setBetSlipOpen(false), onSelectOutcome: handleOutcomeSelect, onPlaceBet: ({ poolId, outcomeId, stake }) => placeBetMutation.mutate({ poolId, outcomeId, stake }) })] }));
};
export default MarketDetailPage;
