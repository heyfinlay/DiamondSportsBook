import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MarketCard } from "../../components/markets/MarketCard";
import { getTeamCode } from "./teamCodes";
import { formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
export function MarketPoolsGrid({ pools, onSelectPool }) {
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.35em] text-amber-200/80", children: "DayBreak Grand Prix" }), _jsx("h2", { className: "text-2xl font-semibold leading-tight text-white md:text-3xl", children: "Active Markets" })] }), _jsxs("p", { className: "text-xs text-white/60", children: [pools.length, " pool", pools.length === 1 ? "" : "s"] })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: pools.map((pool) => {
                    const { favouriteId, bestPayoutId } = getOutcomeRankings(pool.outcomes);
                    const outcomes = pool.outcomes.map((outcome) => ({
                        id: outcome.id,
                        outcomeId: outcome.id,
                        teamCode: getTeamCode(outcome.teamName),
                        teamName: outcome.teamName,
                        teamColor: outcome.teamColor,
                        driverName: outcome.driverName,
                        oddsLabel: formatOdds(outcome.baselineOdds),
                        poolShareLabel: `${formatPercent(outcome.marketShare)} pool`,
                        isFavourite: outcome.id === favouriteId,
                        isBestPayout: outcome.id === bestPayoutId
                    }));
                    return (_jsx(MarketCard, { id: pool.id, name: pool.title, closeTimeLabel: pool.timeRemainingLabel, status: pool.status, totalPool: pool.totalStake, commission: pool.rakePercent, outcomes: outcomes, onViewDetails: () => onSelectPool?.(pool.id), actionLabel: "View market" }, pool.id));
                }) })] }));
}
