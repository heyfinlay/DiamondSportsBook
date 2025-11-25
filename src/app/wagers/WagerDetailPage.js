import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@lib/auth/SessionProvider";
import { fetchWagerById } from "@domains/betting/api/bettingApi";
import { fetchPoolSettlementLedger } from "@domains/betting/api/settlementAuditApi";
import { fetchUiPoolById } from "../../features/markets/api";
import { formatCurrency } from "../../features/markets/utils/format";
const WagerDetailPage = () => {
    const { wagerId } = useParams();
    const { user } = useSession();
    const wagerQuery = useQuery({
        queryKey: ["wager-detail", wagerId],
        queryFn: () => fetchWagerById(wagerId ?? ""),
        enabled: !!wagerId
    });
    const marketId = wagerQuery.data?.market_id;
    const poolQuery = useQuery({
        queryKey: ["wager-pool", marketId],
        queryFn: () => fetchUiPoolById(marketId ?? ""),
        enabled: !!marketId
    });
    const ledgerQuery = useQuery({
        queryKey: ["pool-ledger", marketId],
        queryFn: () => fetchPoolSettlementLedger(marketId ?? ""),
        enabled: !!marketId
    });
    if (!user && !wagerQuery.isLoading) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in to view wager details." }));
    }
    if (wagerQuery.isLoading || !wagerQuery.data) {
        return _jsx("p", { className: "text-sm text-white/60", children: "Loading wager\u2026" });
    }
    const wager = wagerQuery.data;
    const ledgerEntry = ledgerQuery.data?.find((row) => row.wager_id === wager.id);
    const pool = poolQuery.data;
    const poolOutcome = pool?.outcomes.find((outcome) => outcome.id === wager.outcome_id);
    const totalOutcomePool = ledgerEntry?.total_winning_stake && ledgerEntry.total_winning_stake > 0
        ? ledgerEntry.total_winning_stake
        : poolOutcome?.diamondsStaked ?? 0;
    const sharePercent = ledgerEntry?.share_percent ?? 0;
    const payout = ledgerEntry?.payout ?? wager.settled_payout ?? 0;
    const distributionPool = ledgerEntry?.distribution_pool ?? 0;
    const totalBetsForOutcome = poolOutcome?.numBets ?? 0;
    const placedAt = new Date(wager.created_at).toLocaleString();
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Wager" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: wager.market?.name ?? "Market" }), _jsx("p", { className: "text-sm text-white/60", children: wager.market?.event?.title ?? "Event" })] }), _jsx(Link, { to: "/wagers", className: "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60", children: "\u2190 Back to wagers" })] }), _jsxs("section", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Bet Details" }), _jsxs("div", { className: "mt-3 space-y-2", children: [_jsxs("p", { className: "text-lg font-semibold", children: [formatCurrency(wager.stake), " on ", wager.outcome?.label || "Outcome"] }), _jsxs("p", { className: "text-xs text-white/50", children: ["Placed ", placedAt] }), _jsxs("p", { className: "text-xs text-white/70", children: ["Status \u00B7 ", wager.status.replace(/_/g, " ")] })] }), _jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Final Odds" }), _jsxs("p", { className: "mt-1 text-xl font-semibold text-white", children: ["x", wager.effective_odds.toFixed(2)] })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Outcome Pool" }), _jsx("p", { className: "mt-1 text-xl font-semibold text-white", children: formatCurrency(totalOutcomePool) }), _jsx("p", { className: "text-xs text-white/50", children: "Total wagered on this result" })] })] })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Payout Breakdown" }), ledgerEntry ? (_jsxs("div", { className: "mt-3 space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Pool share" }), _jsx("p", { className: "text-lg font-semibold text-white", children: sharePercent > 0 ? `${sharePercent.toFixed(3)}%` : "0%" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Distribution pool" }), _jsx("p", { className: "text-lg font-semibold text-white", children: formatCurrency(distributionPool) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Final payout" }), _jsx("p", { className: "text-2xl font-semibold text-emerald-300", children: formatCurrency(payout) }), _jsx("p", { className: "text-xs text-white/60", children: sharePercent > 0
                                                    ? "Share × distribution pool"
                                                    : "Outcome did not win; stake contributed to pool" })] })] })) : (_jsx("p", { className: "mt-3 text-sm text-white/60", children: "Settlement data will appear once race control confirms the results." }))] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-white", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Outcome context" }), _jsx("h2", { className: "text-xl font-semibold", children: "Where this bet landed" })] }), poolOutcome && (_jsxs("div", { className: "text-xs text-white/60", children: [poolOutcome.numBets.toLocaleString(), " bets \u00B7 ", formatCurrency(poolOutcome.diamondsStaked)] }))] }), _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Total bets on outcome" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-white", children: totalBetsForOutcome.toLocaleString() })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Market handle" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-white", children: formatCurrency(pool?.totalStake ?? wager.market?.total_pool ?? 0) })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Rake" }), _jsxs("p", { className: "mt-1 text-lg font-semibold text-white", children: [(pool?.rakePercent ?? wager.market?.rake_percent ?? 0).toFixed(2), "%"] })] })] })] })] }));
};
export default WagerDetailPage;
