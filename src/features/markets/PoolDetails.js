import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { TrendPill } from "./components/TrendPill";
import { formatCurrency, formatOdds, formatPercent, impliedProbabilityFromOdds } from "./utils/format";
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
export function PoolDetails({ pool, onOutcomeSelect, onOpenBetSlip }) {
    const [selectedOutcomeId, setSelectedOutcomeId] = useState(null);
    const favouriteOutcomeId = useMemo(() => {
        if (!pool.outcomes.length)
            return null;
        return pool.outcomes.reduce((lowest, current) => current.baselineOdds < lowest.baselineOdds ? current : lowest).id;
    }, [pool.outcomes]);
    const handleSelect = (outcomeId) => {
        setSelectedOutcomeId(outcomeId);
        onOutcomeSelect?.(outcomeId);
        onOpenBetSlip?.(pool.id, outcomeId);
    };
    return (_jsxs("section", { className: "space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5 text-white", children: [_jsxs("header", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-xl font-semibold leading-tight md:text-2xl", children: pool.title }), _jsx("p", { className: "max-w-2xl text-sm text-white/60 md:text-base", children: "Odds and market share update in real time until the pool closes." })] }), _jsxs("div", { className: "flex flex-col items-start gap-2 text-sm text-white/60 md:items-end", children: [_jsx("div", { className: `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${statusClasses[pool.status]}`, children: statusLabel[pool.status] }), _jsx("p", { children: pool.timeRemainingLabel }), _jsxs("p", { className: "text-xs text-white/40", children: ["Last updated ", pool.lastUpdatedLabel] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Pool Stats" }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Pool Size" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: formatCurrency(pool.totalStake) })] }), _jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Total Bets" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: pool.totalBets.toLocaleString("en-US") })] }), _jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Rake" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: formatPercent(pool.rakePercent / 100) })] })] })] }), _jsx("div", { className: "flex flex-col gap-3", children: pool.outcomes.map((outcome) => {
                    const isSelected = selectedOutcomeId === outcome.id;
                    const sharePercent = Math.max(outcome.marketShare * 100, 0);
                    const fillWidth = `${Math.min(sharePercent, 100).toFixed(1)}%`;
                    const isFavourite = favouriteOutcomeId === outcome.id;
                    const accentStyle = outcome.teamColor
                        ? { borderLeftColor: outcome.teamColor, borderLeftWidth: "4px" }
                        : undefined;
                    return (_jsxs("button", { type: "button", onClick: () => handleSelect(outcome.id), className: `w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected
                            ? "border-emerald-400/60 bg-white/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"}`, style: accentStyle, children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [outcome.teamColor && (_jsx("span", { className: "h-2.5 w-2.5 rounded-full border border-white/20", style: { backgroundColor: outcome.teamColor }, "aria-hidden": "true" })), _jsx("p", { className: "text-base font-semibold", children: outcome.teamName }), isFavourite && (_jsx("span", { className: "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200", children: "Favourite" }))] }), _jsxs("p", { className: "text-sm text-white/60", children: ["Driver: ", outcome.driverName] })] }), _jsx(TrendPill, { delta: outcome.trendDelta })] }), _jsxs("div", { className: "mt-3 grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/40", children: "Share" }), _jsx("p", { className: "font-semibold", children: formatPercent(outcome.marketShare) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/40", children: "Odds" }), _jsx("p", { className: "font-semibold", children: formatOdds(outcome.baselineOdds) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/40", children: "Bets" }), _jsx("p", { className: "font-semibold", children: outcome.numBets.toLocaleString() })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/40", children: "Amount Bet" }), _jsx("p", { className: "font-semibold", children: formatCurrency(outcome.diamondsStaked) })] })] }), _jsxs("div", { className: "mt-3 space-y-2 text-sm text-white/80", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-white/50", children: [_jsx("span", { children: "Implied probability" }), _jsx("span", { className: "text-white", children: impliedProbabilityFromOdds(outcome.baselineOdds) })] }), _jsx("div", { className: "h-2 w-full rounded-full bg-white/10", children: _jsx("div", { className: "h-full rounded-full bg-sky-500", style: { width: fillWidth } }) })] })] }, outcome.id));
                }) })] }));
}
