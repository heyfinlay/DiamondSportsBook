import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { OutcomeStatusPills } from "./components/OutcomeStatusPills";
import { formatCurrency, formatOdds, formatPercent } from "./utils/format";
import { USE_MARKET_LAYOUT_V2 } from "./flags";
import { getOutcomeRankings } from "./utils/outcomeStats";
const timeframeOptions = [
    { key: "60m", label: "Last 60m" },
    { key: "24h", label: "Last 24h" }
];
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
const getInitials = (name) => {
    if (!name)
        return "--";
    const parts = name.split(" ");
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
export function PoolAnalytics(props) {
    if (USE_MARKET_LAYOUT_V2) {
        return _jsx(LiveBetsAnalytics, { ...props });
    }
    return _jsx(LegacyPoolAnalytics, { ...props });
}
function LiveBetsAnalytics({ pool, liveBets }) {
    const [teamFilter, setTeamFilter] = useState("all");
    const liveBetsForPool = useMemo(() => liveBets.filter((bet) => bet.poolId === pool.id && (teamFilter === "all" || bet.teamName === teamFilter)), [liveBets, pool.id, teamFilter]);
    const liveVolume = liveBetsForPool.reduce((sum, bet) => sum + bet.amount, 0);
    return (_jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-5 text-white", children: [_jsxs("header", { className: "space-y-2", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Live Bets" }), _jsx("h3", { className: "text-xl font-semibold", children: pool.title }), _jsx("p", { className: "text-sm text-white/60", children: "Track wagers as they land. Filter by team to focus on a single outcome." })] }), _jsxs("div", { className: "mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Recent Volume" }), _jsxs("p", { className: "mt-1 text-lg font-semibold text-white", children: [liveBetsForPool.length, " bets \u00B7 ", formatCurrency(liveVolume)] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => setTeamFilter("all"), className: `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${teamFilter === "all"
                            ? "bg-emerald-500 text-slate-950"
                            : "border border-white/20 text-white/80 hover:border-white/40"}`, children: "All" }), pool.outcomes.map((outcome) => (_jsx("button", { type: "button", onClick: () => setTeamFilter(outcome.teamName), className: `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${teamFilter === outcome.teamName
                            ? "bg-white/10 text-emerald-200"
                            : "border border-white/20 text-white/80 hover:border-white/40"}`, children: outcome.teamName }, outcome.id)))] }), _jsx("div", { className: "mt-4 space-y-2", children: liveBetsForPool.length === 0 ? (_jsx("p", { className: "text-sm text-white/60", children: "No live bets yet for this filter." })) : (liveBetsForPool.map((bet) => (_jsxs("article", { className: "flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-white", style: bet.teamColor
                                        ? { backgroundColor: bet.teamColor, color: "#050505" }
                                        : { backgroundColor: "rgba(15,23,42,0.6)" }, children: getInitials(bet.teamName) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-white", children: bet.teamName }), bet.driverName && _jsx("p", { className: "text-xs text-white/60", children: bet.driverName }), _jsxs("p", { className: "text-[11px] text-white/40", children: ["Bet #", bet.id.slice(0, 8), " \u00B7 ", formatRelativeTime(bet.placedAt)] })] })] }), _jsxs("div", { className: "grid flex-1 grid-cols-2 gap-3 text-sm text-white/80 sm:max-w-xs", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Amount" }), _jsx("p", { className: "font-semibold text-white", children: formatCurrency(bet.amount) })] }), _jsxs("div", { className: "text-right sm:text-left", children: [_jsx("p", { className: "text-xs text-white/50", children: "Odds at placement" }), _jsx("p", { className: "font-semibold text-white", children: formatOdds(bet.oddsAtPlacement) })] })] })] }, bet.id)))) })] }));
}
function LegacyPoolAnalytics({ pool, liveBets }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [timeframe, setTimeframe] = useState("60m");
    const [teamFilter, setTeamFilter] = useState("all");
    const sortedOutcomes = useMemo(() => [...pool.outcomes].sort((a, b) => b.diamondsStaked - a.diamondsStaked), [pool.outcomes]);
    const { favouriteId, bestPayoutId } = useMemo(() => getOutcomeRankings(pool.outcomes), [pool.outcomes]);
    const liveBetsForPool = useMemo(() => liveBets.filter((bet) => bet.poolId === pool.id && (teamFilter === "all" || bet.teamName === teamFilter)), [liveBets, pool.id, teamFilter]);
    const liveVolume = liveBetsForPool.reduce((sum, bet) => sum + bet.amount, 0);
    return (_jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-5 text-white", children: [_jsxs("header", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Pool Analytics" }), _jsx("h3", { className: "text-xl font-semibold", children: pool.title })] }), _jsx("div", { className: "flex gap-2", children: ["overview", "live"].map((tab) => (_jsx("button", { type: "button", onClick: () => setActiveTab(tab), className: `rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] transition ${activeTab === tab
                                ? "bg-emerald-500 text-slate-950"
                                : "border border-white/20 text-white/80 hover:border-white/40"}`, children: tab === "overview" ? "Overview" : "Live Bets" }, tab))) })] }), activeTab === "overview" && (_jsxs("div", { className: "mt-4 space-y-4", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Pool Stake" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: formatCurrency(pool.totalStake) })] }), _jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Total Bets" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: pool.totalBets.toLocaleString("en-US") })] }), _jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Last Updated" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: pool.lastUpdatedLabel })] }), _jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-white/50", children: "Rake" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: formatPercent(pool.rakePercent / 100) })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [timeframeOptions.map((option) => (_jsx("button", { type: "button", onClick: () => setTimeframe(option.key), className: `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${timeframe === option.key
                                    ? "bg-white/10 text-emerald-200"
                                    : "border border-white/20 text-white/70 hover:border-white/40"}`, children: option.label }, option.key))), _jsxs("p", { className: "text-xs text-white/40", children: ["Timeframe: ", timeframe] })] }), _jsx("div", { className: "space-y-3", children: sortedOutcomes.map((outcome) => {
                            const sharePercent = Math.max(outcome.marketShare * 100, 0);
                            const fillWidth = `${Math.min(sharePercent, 100).toFixed(1)}%`;
                            const isFavourite = favouriteId === outcome.id;
                            const isBestPayout = bestPayoutId === outcome.id;
                            return (_jsxs("div", { className: "flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "rounded-xl bg-black/30 px-3 py-2", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: outcome.teamName }), _jsx("p", { className: "text-xs text-white/60", children: outcome.driverName })] }), _jsx(OutcomeStatusPills, { isFavourite: isFavourite, isBestPayout: isBestPayout })] }), _jsxs("div", { className: "grid flex-1 grid-cols-2 gap-3 text-sm text-white/80 md:grid-cols-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Total Amount Bet" }), _jsx("p", { className: "font-semibold text-white", children: formatCurrency(outcome.diamondsStaked) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Share" }), _jsx("p", { className: "font-semibold text-white", children: formatPercent(outcome.marketShare) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Odds" }), _jsx("p", { className: "font-semibold text-white", children: formatOdds(outcome.baselineOdds) })] }), _jsx("div", {})] }), _jsxs("div", { className: "w-full md:w-48", children: [_jsx("div", { className: "h-2 w-full rounded-full bg-white/10", children: _jsx("div", { className: "h-full rounded-full", style: {
                                                        width: fillWidth,
                                                        backgroundColor: outcome.teamColor ?? "#38bdf8"
                                                    } }) }), _jsxs("p", { className: "mt-1 text-[11px] text-white/60", children: ["Pool share ", formatPercent(outcome.marketShare)] })] })] }, outcome.id));
                        }) })] })), activeTab === "live" && (_jsxs("div", { className: "mt-4 space-y-4", children: [_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-sm text-white/80", children: "Live feed of wagers for this pool. Updates as bets are placed and priced." }), _jsxs("p", { className: "text-xs text-white/50", children: [liveBetsForPool.length, " bets \u00B7 ", formatCurrency(liveVolume)] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => setTeamFilter("all"), className: `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${teamFilter === "all"
                                    ? "bg-emerald-500 text-slate-950"
                                    : "border border-white/20 text-white/80 hover:border-white/40"}`, children: "All" }), pool.outcomes.map((outcome) => (_jsx("button", { type: "button", onClick: () => setTeamFilter(outcome.teamName), className: `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${teamFilter === outcome.teamName
                                    ? "bg-white/10 text-emerald-200"
                                    : "border border-white/20 text-white/80 hover:border-white/40"}`, children: outcome.teamName }, outcome.id)))] }), _jsxs("div", { className: "space-y-2", children: [liveBetsForPool.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No live bets yet for this filter." })), liveBetsForPool.map((bet) => (_jsxs("div", { className: "flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-sm font-semibold text-white", children: getInitials(bet.teamName) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-white", children: bet.teamName }), bet.driverName && _jsx("p", { className: "text-xs text-white/60", children: bet.driverName })] })] }), _jsxs("div", { className: "grid flex-1 grid-cols-2 gap-3 text-sm text-white/80 sm:grid-cols-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Amount" }), _jsx("p", { className: "font-semibold text-white", children: formatCurrency(bet.amount) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-white/50", children: "Odds at placement" }), _jsx("p", { className: "font-semibold text-white", children: formatOdds(bet.oddsAtPlacement) })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-white/50", children: "Placed" }), _jsx("p", { className: "font-semibold text-white", children: formatRelativeTime(bet.placedAt) })] })] })] }, bet.id)))] })] }))] }));
}
