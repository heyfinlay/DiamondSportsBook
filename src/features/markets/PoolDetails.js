import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
import { getTeamCode } from "./teamCodes";
const formatTrend = (delta) => `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
export function PoolDetails({ pool, liveBets, onOutcomeSelect, onOpenBetSlip }) {
    const [selectedOutcomeId, setSelectedOutcomeId] = useState(null);
    const { favouriteId, bestPayoutId } = useMemo(() => getOutcomeRankings(pool.outcomes), [pool.outcomes]);
    const topWagersByOutcome = useMemo(() => {
        const map = new Map();
        liveBets.forEach((bet) => {
            map.set(bet.outcomeId, (map.get(bet.outcomeId) ?? 0) + bet.amount);
        });
        return map;
    }, [liveBets]);
    const handleSelect = (outcomeId) => {
        setSelectedOutcomeId(outcomeId);
        onOutcomeSelect?.(outcomeId);
        onOpenBetSlip?.(pool.id, outcomeId);
    };
    const sortedOutcomes = [...pool.outcomes].sort((a, b) => b.marketShare - a.marketShare);
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-headline text-3xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Driver Entrants" }), _jsx("p", { className: "mt-2 text-sm text-on-subtle", children: "Select an entrant to launch the slip. Pool share and live momentum update with each new wager." })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { type: "button", className: "prismatic-chip", "data-active": "true", children: "Win" }), _jsx("button", { type: "button", className: "prismatic-chip", children: "Pool Share" }), _jsx("button", { type: "button", className: "prismatic-chip", children: "Live Flow" })] })] }), _jsx("div", { className: "grid gap-4 xl:grid-cols-2", children: sortedOutcomes.map((outcome, index) => {
                    const sharePercent = Math.max(outcome.marketShare * 100, 0);
                    const liveVolume = topWagersByOutcome.get(outcome.id) ?? 0;
                    const isPositive = outcome.trendDelta >= 0;
                    const isSelected = selectedOutcomeId === outcome.id;
                    return (_jsxs("button", { type: "button", onClick: () => handleSelect(outcome.id), className: `grid w-full gap-4 border p-4 text-left transition ${isSelected
                            ? "border-primary-container/45 bg-surface-high"
                            : "border-white/10 bg-surface-low/85 hover:bg-surface"}`, children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_7rem] sm:items-start", children: [_jsx("div", { className: "border-r border-white/10 pr-4 text-center", children: _jsx("span", { className: "font-headline text-3xl font-extrabold italic text-white", children: String(index + 1).padStart(2, "0") }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary-dim", children: getTeamCode(outcome.teamName) }), favouriteId === outcome.id ? (_jsx("span", { className: "text-[0.58rem] uppercase tracking-[0.16em] text-on-subtle", children: "Market Lead" })) : null, bestPayoutId === outcome.id ? (_jsx("span", { className: "text-[0.58rem] uppercase tracking-[0.16em] text-danger", children: "Edge" })) : null] }), _jsx("h3", { className: "mt-2 break-words font-headline text-xl font-extrabold uppercase tracking-[0.04em] text-white sm:text-[1.35rem]", children: outcome.driverName }), _jsx("p", { className: "mt-1 text-[0.7rem] uppercase tracking-[0.14em] text-on-subtle", children: outcome.teamName })] }), _jsx("div", { className: "border border-white/10 bg-surface-high px-3 py-3 text-center", children: _jsx("p", { className: "font-headline text-2xl font-extrabold text-primary-dim sm:text-3xl", children: formatOdds(outcome.baselineOdds) }) })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-[minmax(0,1fr)_6rem_6rem] sm:items-end", children: [_jsxs("div", { className: "grid gap-2", children: [_jsx("div", { className: "flex items-center gap-[2px]", children: Array.from({ length: 10 }).map((_, barIndex) => (_jsx("span", { className: "h-3.5 flex-1 border border-white/10", style: {
                                                        backgroundColor: barIndex < Math.round(sharePercent / 10)
                                                            ? outcome.teamColor ?? "#00f2ff"
                                                            : "rgba(50,53,57,0.45)"
                                                    } }, barIndex))) }), _jsxs("div", { className: "flex items-center justify-between text-[0.66rem] uppercase tracking-[0.14em] text-on-subtle", children: [_jsx("span", { children: "Share" }), _jsx("span", { className: "font-semibold text-white", children: formatPercent(outcome.marketShare) })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: "Flow" }), _jsx("p", { className: "mt-1.5 text-sm font-semibold text-white", children: liveVolume > 0 ? `${Math.round(liveVolume).toLocaleString()}` : "Quiet" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: "Trend" }), _jsxs("div", { className: `mt-1.5 inline-flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-primary-dim" : "text-danger"}`, children: [isPositive ? _jsx(ArrowUpRight, { className: "h-3.5 w-3.5" }) : _jsx(ArrowDownRight, { className: "h-3.5 w-3.5" }), _jsx("span", { children: formatTrend(outcome.trendDelta) })] })] })] })] }, outcome.id));
                }) })] }));
}
