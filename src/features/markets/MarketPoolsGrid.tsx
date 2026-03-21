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
        <div>
          <p className="prismatic-kicker text-primary-dim">Live Market Vault</p>
          <h2 className="mt-2 font-headline text-3xl font-extrabold uppercase tracking-[0.06em] text-white">
            Prime Markets
          </h2>
        </div>
        <p className="prismatic-kicker">
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
              outcomes={outcomes.slice(0, 4)}
              onViewDetails={() => onSelectPool?.(pool.id)}
              actionLabel="Inspect"
              subtitle={pool.status === "open" ? "Live Market" : "Vault Window"}
            />
          );
        })}
      </div>
    </section>
  );
}
