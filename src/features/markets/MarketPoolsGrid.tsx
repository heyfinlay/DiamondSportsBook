import React from "react";
import { MarketCard } from "../../components/markets/MarketCard";
import { getTeamCode } from "./teamCodes";
import { formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
import type { Pool } from "./types";

interface MarketPoolsGridProps {
  pools: Pool[];
  onSelectPool?: (poolId: string) => void;
  onSelectOutcome?: (poolId: string, poolTitle: string, outcome: Pool["outcomes"][number]) => void;
}

export function MarketPoolsGrid({ pools, onSelectPool, onSelectOutcome }: MarketPoolsGridProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold leading-tight text-white md:text-3xl">Active Markets</h2>
        <p className="text-xs text-white/60">
          {pools.length} pool{pools.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4">
        {pools.map((pool) => {
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

          return (
            <MarketCard
              key={pool.id}
              id={pool.id}
              name={pool.title}
              closeTimeLabel={pool.timeRemainingLabel}
              status={pool.status}
              totalPool={pool.totalStake}
              commission={pool.rakePercent}
              outcomes={outcomes.slice(0, 6)}
              onViewDetails={() => onSelectPool?.(pool.id)}
              actionLabel="View market"
              subtitle="Leading outcomes"
            />
          );
        })}
      </div>
    </section>
  );
}
