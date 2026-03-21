import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MarketCard } from "../../components/markets/MarketCard";
import { getTeamCode } from "./teamCodes";
import { formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
export function MarketPoolsGrid({ pools, onSelectPool, onSelectOutcome }) {
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Live Market Vault" }), _jsx("h2", { className: "mt-2 font-headline text-3xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Prime Markets" })] }), _jsxs("p", { className: "prismatic-kicker", children: [pools.length, " pool", pools.length === 1 ? "" : "s"] })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2 2xl:grid-cols-4", children: pools.map((pool) => {
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
                        poolSharePercent: Math.max(0, Math.min(outcome.marketShare * 100, 100)),
                        isFavourite: outcome.id === favouriteId,
                        isBestPayout: outcome.id === bestPayoutId,
                        onSelect: () => onSelectOutcome?.(pool.id, pool.title, outcome)
                    }));
                    return (_jsx(MarketCard, { id: pool.id, name: pool.title, closeTimeLabel: pool.timeRemainingLabel, status: pool.status, totalPool: pool.totalStake, commission: pool.rakePercent, outcomes: outcomes.slice(0, 4), onViewDetails: () => onSelectPool?.(pool.id), actionLabel: "Inspect", subtitle: pool.status === "open" ? "Live Market" : "Vault Window" }, pool.id));
                }) })] }));
}
