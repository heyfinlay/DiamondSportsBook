import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TimerReset } from "lucide-react";
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
    if (!marketId) {
        return _jsx("div", { className: "prismatic-card px-5 py-4 text-on-subtle", children: "Market not found." });
    }
    if (poolQuery.isLoading) {
        return _jsx("div", { className: "prismatic-card px-5 py-4 text-on-subtle", children: "Loading market\u2026" });
    }
    if (!pool) {
        return _jsx("div", { className: "prismatic-card px-5 py-4 text-on-subtle", children: "Pool not available." });
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
    const mostActiveOutcome = useMemo(() => [...pool.outcomes].sort((a, b) => b.trendDelta - a.trendDelta)[0], [pool.outcomes]);
    const whaleAlerts = useMemo(() => [...(liveBetsQuery.data ?? [])].sort((a, b) => b.amount - a.amount).slice(0, 3), [liveBetsQuery.data]);
    const renderSettlementsPanel = () => {
        if (!isPoolSettled)
            return null;
        if (settlementsQuery.isLoading) {
            return _jsx("div", { className: "prismatic-card p-6 text-sm text-on-subtle", children: "Loading final settlements\u2026" });
        }
        if (settlementsQuery.isError) {
            return (_jsxs("div", { className: "border border-danger/30 bg-danger/10 p-6 text-sm text-danger", children: [_jsx("p", { children: "We couldn\u2019t load the settlement ledger." }), _jsx("button", { type: "button", className: "prismatic-button prismatic-button-secondary mt-4", onClick: () => settlementsQuery.refetch(), children: "Retry" })] }));
        }
        return (_jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "prismatic-metric px-5 py-4", children: [_jsx("p", { className: "prismatic-kicker", children: "Total Pool" }), _jsx("p", { className: "mt-2 font-headline text-3xl font-extrabold text-white", children: formatCurrency(pool.totalStake) })] }), _jsxs("div", { className: "prismatic-metric px-5 py-4", children: [_jsx("p", { className: "prismatic-kicker", children: "Winning Outcome" }), _jsx("p", { className: "mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.05em] text-white", children: winningOutcomeName })] }), _jsxs("div", { className: "prismatic-metric px-5 py-4", children: [_jsx("p", { className: "prismatic-kicker", children: "Paid To Winners" }), _jsx("p", { className: "mt-2 font-headline text-3xl font-extrabold text-primary-dim", children: formatCurrency(totalPaidOut) })] })] }), _jsx(FinalSettlementsTable, { rows: settlements })] }));
    };
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "prismatic-card p-8 md:p-10", children: [_jsx("div", { className: "absolute inset-0 bg-[linear-gradient(98deg,rgba(13,16,20,0.98)_0%,rgba(14,18,24,0.92)_42%,rgba(10,16,20,0.46)_100%)]" }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,242,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(225,253,255,0.08),transparent_26%)] opacity-95" }), _jsx("div", { className: "absolute inset-y-0 right-0 hidden w-[38%] bg-[linear-gradient(135deg,rgba(0,242,255,0.18),rgba(0,242,255,0.02)_62%)] lg:block" }), _jsxs("div", { className: "relative flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end", children: [_jsxs("div", { className: "max-w-4xl", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("span", { className: "bg-primary-container px-3 py-1 text-[0.64rem] font-headline font-bold uppercase tracking-[0.16em] text-on-primary", children: "Live Market" }), _jsx("span", { className: "text-[0.72rem] uppercase tracking-[0.16em] text-on-subtle", children: pool.timeRemainingLabel })] }), _jsx("h1", { className: "mt-6 font-headline text-4xl font-extrabold uppercase italic tracking-[0.03em] text-white sm:text-5xl lg:text-6xl", children: pool.title }), _jsx("p", { className: "mt-4 max-w-3xl text-sm leading-7 text-on-subtle sm:text-base", children: "Precision pricing for every entrant. Pool share, trend, and live flow update with each new ticket." })] }), _jsxs("div", { className: "border border-primary-container/30 bg-[linear-gradient(135deg,rgba(225,253,255,0.16),rgba(0,242,255,0.14))] px-6 py-6 text-left shadow-[0_0_36px_rgba(0,242,255,0.12)] xl:justify-self-end", children: [_jsx("p", { className: "prismatic-kicker text-on-primary/80", children: "Total Pool Liquidity" }), _jsx("p", { className: "mt-3 font-headline text-4xl font-extrabold tracking-tight text-white sm:text-5xl", children: formatCurrency(pool.totalStake) }), _jsxs("p", { className: "mt-3 text-[0.7rem] uppercase tracking-[0.14em] text-on-primary/80", children: [pool.totalBets.toLocaleString(), " active tickets across the market"] })] })] })] }), !sessionLoading && !user ? _jsx(AuthCtaBanner, {}) : null, _jsxs("section", { className: "grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_20rem] 2xl:grid-cols-[minmax(0,1.9fr)_22rem]", children: [_jsx(PoolDetails, { pool: pool, liveBets: liveBetsQuery.data ?? [], onOutcomeSelect: handleOutcomeSelect, onOpenBetSlip: handleOpenBetSlip }), _jsxs("div", { className: "space-y-6", children: [_jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "font-headline text-xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Whale Alerts" }), _jsx("span", { className: "inline-flex h-3 w-3 bg-primary-container" })] }), _jsx("div", { className: "mt-5 space-y-3", children: whaleAlerts.length ? (whaleAlerts.map((bet) => (_jsx("article", { className: "border-l-2 border-primary-container bg-surface px-3 py-3", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "prismatic-kicker text-[0.58rem] text-primary-dim", children: ["Entry: ", formatCurrency(bet.amount)] }), _jsx("p", { className: "mt-1.5 font-headline text-base font-extrabold uppercase tracking-[0.05em] text-white", children: bet.driverName ?? bet.teamName }), _jsxs("p", { className: "mt-1 text-xs text-on-subtle", children: ["Heavy position into ", bet.teamName] })] }), _jsx("p", { className: "shrink-0 pt-0.5 text-[0.62rem] uppercase tracking-[0.14em] text-on-subtle", children: formatRelativeTime(bet.placedAt) })] }) }, bet.id)))) : (_jsx("p", { className: "text-sm text-on-subtle", children: "No outsized entries detected yet." })) })] }) }), _jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10 space-y-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(TimerReset, { className: "h-5 w-5 text-primary-dim" }), _jsx("h2", { className: "font-headline text-xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Market Signal" })] }), _jsxs("div", { className: "space-y-4", children: [_jsx(SignalMetric, { label: "Pool Depth", value: `${pool.totalBets.toLocaleString()} tickets`, fill: Math.min(Math.max(pool.totalBets / 2, 20), 96) }), _jsx(SignalMetric, { label: "Live Flow", value: formatCurrency((liveBetsQuery.data ?? []).reduce((sum, bet) => sum + bet.amount, 0)), fill: Math.min(Math.max(((liveBetsQuery.data ?? []).length * 16), 12), 92) }), _jsx(SignalMetric, { label: "Lead Signal", value: mostActiveOutcome?.driverName ?? "Pending", fill: Math.min(Math.max((mostActiveOutcome?.marketShare ?? 0) * 100, 18), 92) })] })] }) })] })] }), isPoolSettled ? renderSettlementsPanel() : _jsx(PoolAnalytics, { pool: pool, liveBets: liveBetsQuery.data ?? [] }), _jsx(BetSlipDrawer, { isOpen: betSlipOpen, pool: pool, outcomes: pool.outcomes, selectedOutcomeId: selectedOutcomeId, onClose: () => setBetSlipOpen(false), onSelectOutcome: handleOutcomeSelect, onPlaceBet: ({ poolId, outcomeId, stake }) => placeBetMutation.mutate({ poolId, outcomeId, stake }), isPlacing: placeBetMutation.isPending })] }));
};
const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    if (Number.isNaN(diffMs))
        return "--";
    const seconds = Math.max(Math.floor(diffMs / 1000), 0);
    if (seconds < 60)
        return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};
const SignalMetric = ({ label, value, fill }) => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("p", { className: "font-headline text-sm font-bold uppercase tracking-[0.08em] text-on-subtle", children: label }), _jsx("p", { className: "text-sm font-semibold text-primary-dim", children: value })] }), _jsx("div", { className: "mt-3 h-1.5 bg-white/10", children: _jsx("div", { className: "h-full bg-primary-container", style: { width: `${fill}%` } }) })] }));
export default MarketDetailPage;
