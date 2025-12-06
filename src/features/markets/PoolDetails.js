import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { MarketCard } from "../../components/markets/MarketCard";
import { formatCurrency, formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
import { getTeamCode } from "./teamCodes";
const statusLabel = {
    open: "Open",
    closing_soon: "Closing Soon",
    closed: "Closed",
    settled: "Settled"
};
export function PoolDetails({ pool, liveBets, onOutcomeSelect, onOpenBetSlip }) {
    const [selectedOutcomeId, setSelectedOutcomeId] = useState(null);
    const { favouriteId, bestPayoutId } = useMemo(() => getOutcomeRankings(pool.outcomes), [pool.outcomes]);
    const handleSelect = (outcomeId) => {
        setSelectedOutcomeId(outcomeId);
        onOutcomeSelect?.(outcomeId);
        onOpenBetSlip?.(pool.id, outcomeId);
    };
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(MarketCard, { id: pool.id, name: pool.title, closeTimeLabel: pool.timeRemainingLabel, status: pool.status, totalPool: pool.totalStake, commission: pool.rakePercent, outcomes: pool.outcomes.map((outcome) => ({
                    id: outcome.id,
                    outcomeId: outcome.id,
                    teamCode: outcome.teamCode ?? getTeamCode(outcome.teamName),
                    teamName: outcome.teamName,
                    teamColor: outcome.teamColor,
                    driverName: outcome.driverName,
                    oddsLabel: formatOdds(outcome.baselineOdds),
                    poolShareLabel: `${formatPercent(outcome.marketShare)} pool`,
                    poolSharePercent: Math.max(0, Math.min(outcome.marketShare * 100, 100)),
                    isFavourite: favouriteId === outcome.id,
                    isBestPayout: bestPayoutId === outcome.id
                })), selectedOutcomeId: selectedOutcomeId, onSelectOutcome: handleSelect }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-white/50", children: "Pool Size" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-white", children: formatCurrency(pool.totalStake) }), _jsx("p", { className: "text-xs text-white/40", children: "Combined stakes across all outcomes" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-white/50", children: "Total Bets" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-white", children: pool.totalBets.toLocaleString("en-US") }), _jsxs("p", { className: "text-xs text-white/40", children: ["Live tickets on this pool \u00B7 ", liveBets.length.toLocaleString("en-US")] })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-white/50", children: "Commission" }), _jsxs("p", { className: "mt-1 text-lg font-semibold text-white", children: [pool.rakePercent.toFixed(1), "%"] }), _jsx("p", { className: "text-xs text-white/40", children: "House takeout on settlements" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-white/50", children: "Updated" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-white", children: pool.lastUpdatedLabel }), _jsxs("p", { className: "text-xs text-white/40", children: ["Status: ", statusLabel[pool.status]] })] })] })] }));
}
