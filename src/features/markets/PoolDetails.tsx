import React, { useMemo, useState } from "react";
import { MarketCard } from "../../components/markets/MarketCard";
import { deriveOutcomeCode } from "../../components/markets/outcomeHelpers";
import { formatCurrency, formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
import type { Pool, PoolStatus } from "./types";

interface PoolDetailsProps {
  pool: Pool;
  onOutcomeSelect?: (outcomeId: string) => void;
  onOpenBetSlip?: (poolId: string, outcomeId: string) => void;
}

const statusLabel: Record<PoolStatus, string> = {
  open: "Open",
  closing_soon: "Closing Soon",
  closed: "Closed",
  settled: "Settled"
};

export function PoolDetails({ pool, onOutcomeSelect, onOpenBetSlip }: PoolDetailsProps) {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);

  const { favouriteId, bestPayoutId } = useMemo(
    () => getOutcomeRankings(pool.outcomes),
    [pool.outcomes]
  );

  const handleSelect = (outcomeId: string) => {
    setSelectedOutcomeId(outcomeId);
    onOutcomeSelect?.(outcomeId);
    onOpenBetSlip?.(pool.id, outcomeId);
  };

  return (
    <section className="space-y-4">
      <MarketCard
        id={pool.id}
        name={pool.title}
        closeTimeLabel={pool.timeRemainingLabel}
        status={pool.status}
        totalPool={pool.totalStake}
        commission={pool.rakePercent}
        outcomes={pool.outcomes.map((outcome) => ({
          id: outcome.id,
          shortName: deriveOutcomeCode(outcome.driverName ?? outcome.teamName),
          fullName: outcome.driverName ?? outcome.teamName,
          teamColor: outcome.teamColor,
          oddsLabel: formatOdds(outcome.baselineOdds),
          poolShareLabel: `${formatPercent(outcome.marketShare)} pool`,
          isFavourite: favouriteId === outcome.id,
          isBestPayout: bestPayoutId === outcome.id
        }))}
        selectedOutcomeId={selectedOutcomeId}
        onSelectOutcome={handleSelect}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/50">Pool Size</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(pool.totalStake)}</p>
          <p className="text-xs text-white/40">Combined stakes across all outcomes</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/50">Total Bets</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {pool.totalBets.toLocaleString("en-US")}
          </p>
          <p className="text-xs text-white/40">Live tickets on this pool</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/50">Commission</p>
          <p className="mt-1 text-lg font-semibold text-white">{pool.rakePercent.toFixed(1)}%</p>
          <p className="text-xs text-white/40">House takeout on settlements</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/50">Updated</p>
          <p className="mt-1 text-lg font-semibold text-white">{pool.lastUpdatedLabel}</p>
          <p className="text-xs text-white/40">Status: {statusLabel[pool.status]}</p>
        </div>
      </div>
    </section>
  );
}
