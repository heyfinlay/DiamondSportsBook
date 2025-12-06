import React from "react";
import { MarketCard } from "../../components/markets/MarketCard";
import { deriveOutcomeCode } from "../../components/markets/outcomeHelpers";
import { formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
import type { Pool } from "./types";

interface MarketPoolsGridProps {
  pools: Pool[];
  onSelectPool?: (poolId: string) => void;
}

export function MarketPoolsGrid({ pools, onSelectPool }: MarketPoolsGridProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-amber-200/80">
            DayBreak Grand Prix
          </p>
          <h2 className="text-2xl font-semibold leading-tight text-white md:text-3xl">
            Active Markets
          </h2>
        </div>
        <p className="text-xs text-white/60">
          {pools.length} pool{pools.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pools.map((pool) => {
          const { favouriteId, bestPayoutId } = getOutcomeRankings(pool.outcomes);

          const outcomes = pool.outcomes.map((outcome) => ({
            id: outcome.id,
            shortName: deriveOutcomeCode(outcome.driverName ?? outcome.teamName),
            fullName: outcome.driverName ?? outcome.teamName,
            teamColor: outcome.teamColor,
            oddsLabel: formatOdds(outcome.baselineOdds),
            poolShareLabel: `${formatPercent(outcome.marketShare)} pool`,
            isFavourite: outcome.id === favouriteId,
            isBestPayout: outcome.id === bestPayoutId
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
              outcomes={outcomes}
              onViewDetails={() => onSelectPool?.(pool.id)}
              actionLabel="View market"
            />
          );
        })}
      </div>
    </section>
  );
}
