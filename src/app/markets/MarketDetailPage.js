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
import FinalSettlementsTable from "../../features/markets/components/FinalSettlementsTable";
import { formatCurrency } from "../../features/markets/utils/format";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys, walletKeys } from "@lib/query/keys";
import { fetchPoolSettlementLedger } from "@domains/betting/api/settlementAuditApi";
import { refetchAfterBet } from "@lib/query/refetchers";
import { LIVE_BETS_POLL_INTERVAL_MS, MARKET_POLL_INTERVAL_MS } from "@config/realtime";
import { MarketHeroCard } from "../../components/markets/MarketHeroCard";
// Layout baseline restored from commit 9208937 (markets UI v2) while the team metadata/API work from 23eeb03 stays intact.
// v2 Markets detail page: maps v1 pool/outcome totals into the new UI components.
const MarketDetailPage = () => {
    const { marketId } = useParams();
    const queryClient = useQueryClient();
    const [betSlipOpen, setBetSlipOpen] = useState(false);
    const [selectedOutcomeId, setSelectedOutcomeId] = useState(null);
    const { user, loading: sessionLoading } = useSession();
    useBettingRealtime(marketId);
    const poolQuery = useQuery({
        queryKey: marketKeys.pool(marketId),
        queryFn: () => fetchUiPoolById(marketId),
        enabled: !!marketId,
        refetchInterval: MARKET_POLL_INTERVAL_MS
    });
    const liveBetsQuery = useQuery({
        queryKey: marketKeys.liveBets(marketId),
        queryFn: () => fetchUiLiveBetsForPool(marketId),
        enabled: !!marketId,
        refetchInterval: LIVE_BETS_POLL_INTERVAL_MS
    });
    const isPoolSettled = poolQuery.data?.status === "settled";
    const settlementsQuery = useQuery({
        queryKey: ["pool-ledger", marketId],
        queryFn: () => fetchPoolSettlementLedger(marketId),
        enabled: !!marketId && isPoolSettled
    });
    const placeBetMutation = useMutation({
        mutationFn: ({ poolId, outcomeId, stake }) => placeWager(poolId, outcomeId, stake, crypto.randomUUID()),
        onMutate: async (variables) => {
            if (!user?.id)
                return {};
            const balanceKey = walletKeys.balance(user.id);
            await queryClient.cancelQueries({ queryKey: balanceKey });
            const previousBalance = queryClient.getQueryData(balanceKey);
            if (previousBalance) {
                queryClient.setQueryData(balanceKey, {
                    balance: Math.max(0, previousBalance.balance - variables.stake)
                });
            }
            return { previousBalance, balanceKey };
        },
        onError: (_error, _variables, context) => {
            if (context?.previousBalance && context.balanceKey) {
                queryClient.setQueryData(context.balanceKey, context.previousBalance);
            }
        },
        onSuccess: (_data, variables) => {
            refetchAfterBet(queryClient, { marketId: variables.poolId, userId: user?.id });
            setBetSlipOpen(false);
        }
    });
    const pool = poolQuery.data ?? null;
    const statusLabel = {
        open: "Open",
        closing_soon: "Closing Soon",
        closed: "Closed",
        settled: "Settled"
    };
    const statusClasses = {
        open: "bg-emerald-500/10 text-emerald-200 border-emerald-500/40",
        closing_soon: "bg-amber-500/10 text-amber-200 border-amber-500/40",
        closed: "bg-slate-700/60 text-slate-200 border-slate-600/60",
        settled: "bg-indigo-500/10 text-indigo-200 border-indigo-500/40"
    };
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
    const settlements = settlementsQuery.data ?? [];
    const winnerRows = settlements.filter((row) => row.payout > 0);
    const winningOutcomeName = winnerRows[0]?.outcome_label ?? "Winning outcome";
    const totalPaidOut = winnerRows.reduce((sum, row) => sum + row.payout, 0);
    const renderSettlementsPanel = () => {
        if (!isPoolSettled)
            return null;
        if (settlementsQuery.isLoading) {
            return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/70", children: "Loading final settlements\u2026" }));
        }
        if (settlementsQuery.isError) {
            return (_jsxs("div", { className: "rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100", children: [_jsx("p", { children: "We couldn\u2019t load the settlement ledger." }), _jsx("button", { type: "button", className: "mt-3 rounded-full border border-red-300/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]", onClick: () => settlementsQuery.refetch(), children: "Retry" })] }));
        }
        return (_jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Total Pool" }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-white", children: formatCurrency(pool.totalStake) }), _jsx("p", { className: "text-xs text-white/50", children: "Combined stakes across all outcomes" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Winning Outcome" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-white", children: winningOutcomeName }), _jsxs("p", { className: "text-xs text-white/50", children: [winnerRows.length, " winning bets"] })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Paid to winners" }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-emerald-300", children: formatCurrency(totalPaidOut) }), _jsx("p", { className: "text-xs text-white/50", children: "After rake distribution" })] })] }), _jsx(FinalSettlementsTable, { rows: settlements })] }));
    };
    return (_jsxs("div", { className: "mx-auto flex max-w-5xl flex-col gap-8", children: [_jsx(MarketHeroCard, { label: "Market Detail", title: pool.title, description: _jsx("p", { children: "Explore every outcome with live odds and pool share. Click a tile to launch the bet slip." }), rightMeta: {
                    status: pool.status,
                    statusLabel: statusLabel[pool.status],
                    statusClassName: statusClasses[pool.status],
                    badgeContent: `${formatCurrency(pool.totalStake)} Pool`
                } }), !sessionLoading && !user && _jsx(AuthCtaBanner, {}), _jsxs("section", { className: "flex flex-col gap-6", children: [_jsx(PoolDetails, { pool: pool, liveBets: liveBetsQuery.data ?? [], onOutcomeSelect: handleOutcomeSelect, onOpenBetSlip: handleOpenBetSlip }), isPoolSettled ? (renderSettlementsPanel()) : (_jsx(PoolAnalytics, { pool: pool, liveBets: liveBetsQuery.data ?? [] }))] }), _jsx(BetSlipDrawer, { isOpen: betSlipOpen, pool: pool, outcomes: pool.outcomes, selectedOutcomeId: selectedOutcomeId, onClose: () => setBetSlipOpen(false), onSelectOutcome: handleOutcomeSelect, onPlaceBet: ({ poolId, outcomeId, stake }) => placeBetMutation.mutate({ poolId, outcomeId, stake }), isPlacing: placeBetMutation.isPending })] }));
};
export default MarketDetailPage;
