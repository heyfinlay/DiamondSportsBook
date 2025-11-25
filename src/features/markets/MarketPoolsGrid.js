import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { OutcomeStatusPills } from "./components/OutcomeStatusPills";
import { OutcomeIdentity } from "./components/OutcomeIdentity";
import { formatCurrency, formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
const statusLabel = {
    open: "Open",
    closing_soon: "Closing Soon",
    closed: "Closed",
    settled: "Settled"
};
const statusClasses = {
    open: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    closing_soon: "bg-amber-500/10 text-amber-200 border-amber-500/40",
    closed: "bg-slate-700/60 text-slate-300 border-slate-600/60",
    settled: "bg-indigo-500/10 text-indigo-200 border-indigo-500/40"
};
export function MarketPoolsGrid({ pools, onSelectPool }) {
    return (_jsxs("section", { className: "w-full rounded-3xl border border-white/10 bg-black/30 px-4 py-6 text-slate-50 shadow-[0_0_30px_rgba(3,7,18,0.5)] md:px-6 lg:px-8", children: [_jsxs("header", { className: "mb-6 flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "DayBreak Grand Prix" }), _jsx("h2", { className: "text-2xl font-semibold leading-tight text-white md:text-3xl", children: "Active Markets" })] }), _jsxs("p", { className: "text-xs text-white/50", children: [pools.length, " pool", pools.length === 1 ? "" : "s"] })] }), _jsx("div", { className: "grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3", children: pools.map((pool) => {
                    const sorted = [...pool.outcomes].sort((a, b) => b.marketShare - a.marketShare);
                    const { favouriteId, bestPayoutId } = getOutcomeRankings(pool.outcomes);
                    const distributionLabel = `${pool.outcomes.length} outcome${pool.outcomes.length === 1 ? "" : "s"}`;
                    const racePrefix = pool.title.split("·")[0]?.trim() ?? pool.title;
                    const leadingOutcome = sorted[0];
                    return (_jsxs("article", { className: "flex h-full flex-col rounded-2xl border border-white/10 bg-black/40 p-4", children: [_jsxs("div", { className: "mb-3 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold leading-tight text-white", children: pool.title }), _jsx("p", { className: "text-xs text-white/60", children: pool.timeRemainingLabel })] }), _jsx("span", { className: `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${statusClasses[pool.status]}`, children: statusLabel[pool.status] })] }), _jsxs("div", { className: "mb-3 grid gap-3 text-sm text-white sm:grid-cols-2", children: [_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs text-white/50", children: "Total Pool" }), _jsx("span", { className: "font-semibold", children: formatCurrency(pool.totalStake) })] }), _jsxs("div", { className: "text-right", children: [_jsx("span", { className: "text-xs text-white/50", children: "Bets" }), _jsx("span", { className: "block font-semibold", children: pool.totalBets.toLocaleString("en-US") })] })] }), leadingOutcome ? (_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-3 py-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50", children: [_jsx("span", { children: "Leading Outcome" }), _jsx("span", { children: formatPercent(leadingOutcome.marketShare) })] }), _jsxs("div", { className: "mt-2 flex items-center justify-between", children: [_jsx(OutcomeIdentity, { teamName: leadingOutcome.teamName, driverName: leadingOutcome.driverName, teamColor: leadingOutcome.teamColor, hideSwatch: true, primaryClassName: "text-sm font-semibold text-white", secondaryClassName: "text-xs text-white/60" }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-white/50", children: "Odds" }), _jsx("p", { className: "text-sm font-semibold text-white", children: formatOdds(leadingOutcome.baselineOdds) })] })] })] })) : (_jsx("div", { className: "rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60", children: "Market will show leaders once bets arrive." }))] }), _jsxs("div", { className: "mb-2 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/50", children: [_jsx("span", { children: "Market Distribution" }), _jsx("span", { children: distributionLabel })] }), _jsx("div", { className: "flex flex-col gap-3", children: sorted.slice(0, 5).map((outcome, i) => {
                                    if (i === 0)
                                        console.log("ROW OUTCOME", outcome);
                                    const sharePercent = Math.max(outcome.marketShare * 100, 0);
                                    const isFavourite = outcome.id === favouriteId;
                                    const isBestPayout = outcome.id === bestPayoutId;
                                    const fillWidth = `${Math.min(sharePercent, 100).toFixed(1)}%`;
                                    return (_jsx("div", { className: "rounded-xl border border-white/5 bg-white/5 px-3 py-2", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 overflow-hidden", children: [_jsx(OutcomeIdentity, { teamName: outcome.teamName, driverName: outcome.driverName, teamColor: outcome.teamColor, className: "items-start", primaryClassName: "truncate text-sm font-semibold text-white", secondaryClassName: "text-xs text-white/50" }), _jsx("div", { className: "mt-2 h-2 w-full rounded-full bg-white/10", children: _jsx("div", { className: "h-full rounded-full", style: {
                                                                    width: fillWidth,
                                                                    backgroundColor: outcome.teamColor ?? "#38bdf8"
                                                                } }) }), _jsxs("p", { className: "mt-1 text-[11px] text-white/50", children: ["Total Bet: ", formatCurrency(outcome.diamondsStaked)] })] }), _jsxs("div", { className: "flex flex-col items-end gap-1 text-right", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: formatOdds(outcome.baselineOdds) }), _jsxs("p", { className: "text-xs text-white/60", children: ["Share: ", formatPercent(outcome.marketShare)] }), _jsx(OutcomeStatusPills, { isFavourite: isFavourite, isBestPayout: isBestPayout })] })] }) }, outcome.id));
                                }) }), _jsxs("div", { className: "mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80", children: [_jsxs("div", { className: "text-xs text-white/50", children: ["View full market \u00B7 ", racePrefix] }), _jsx("button", { type: "button", className: "rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-emerald-400", onClick: () => onSelectPool?.(pool.id), children: "View Market" })] })] }, pool.id));
                }) })] }));
}
