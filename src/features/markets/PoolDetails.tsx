import React, { useMemo, useState } from "react";
import { TrendPill } from "./components/TrendPill";
import {
  formatDiamonds,
  formatOdds,
  formatPercent,
  impliedProbabilityFromOdds
} from "./utils/format";
import type { LiveBet, Pool, PoolStatus } from "./types";

interface PoolDetailsProps {
  pool: Pool;
  liveBets?: LiveBet[];
  onOutcomeSelect?: (outcomeId: string) => void;
  onOpenBetSlip?: (poolId: string, outcomeId: string) => void;
}

const statusLabel: Record<PoolStatus, string> = {
  open: "Open",
  closing_soon: "Closing Soon",
  closed: "Closed",
  settled: "Settled"
};

const statusClasses: Record<PoolStatus, string> = {
  open: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  closing_soon: "bg-amber-500/10 text-amber-200 border-amber-500/40",
  closed: "bg-slate-700/60 text-slate-300 border-slate-600/60",
  settled: "bg-indigo-500/10 text-indigo-200 border-indigo-500/40"
};

export function PoolDetails({
  pool,
  liveBets: _liveBets,
  onOutcomeSelect,
  onOpenBetSlip
}: PoolDetailsProps) {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);

  const favouriteOutcomeId = useMemo(() => {
    if (!pool.outcomes.length) return null;
    return pool.outcomes.reduce((lowest, current) =>
      current.baselineOdds < lowest.baselineOdds ? current : lowest
    ).id;
  }, [pool.outcomes]);

  const handleSelect = (outcomeId: string) => {
    setSelectedOutcomeId(outcomeId);
    onOutcomeSelect?.(outcomeId);
    onOpenBetSlip?.(pool.id, outcomeId);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5 text-white">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold leading-tight md:text-2xl">{pool.title}</h2>
          <p className="max-w-2xl text-sm text-white/60 md:text-base">
            Odds and market share update in real time until the pool closes.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm text-white/60 md:items-end">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${statusClasses[pool.status]}`}
          >
            {statusLabel[pool.status]}
          </div>
          <p>{pool.timeRemainingLabel}</p>
          <p className="text-xs text-white/40">Last updated {pool.lastUpdatedLabel}</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Pool Size</p>
          <p className="mt-1 text-lg font-semibold">Ɖ{formatDiamonds(pool.totalStake)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Bets</p>
          <p className="mt-1 text-lg font-semibold">{pool.totalBets.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Rake</p>
          <p className="mt-1 text-lg font-semibold">{formatPercent(pool.rakePercent / 100)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {pool.outcomes.map((outcome) => {
          const isSelected = selectedOutcomeId === outcome.id;
          const sharePercent = Math.max(outcome.marketShare * 100, 0);
          const fillWidth = `${Math.min(sharePercent, 100).toFixed(1)}%`;
          const isFavourite = favouriteOutcomeId === outcome.id;

          return (
            <button
              key={outcome.id}
              type="button"
              onClick={() => handleSelect(outcome.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-emerald-400/60 bg-white/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold">{outcome.teamName}</p>
                    {isFavourite && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                        Favourite
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60">Driver: {outcome.driverName}</p>
                </div>
                <TrendPill delta={outcome.trendDelta} />
              </div>

              <div className="mt-3 grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Share</p>
                  <p className="font-semibold">{formatPercent(outcome.marketShare)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Odds</p>
                  <p className="font-semibold">{formatOdds(outcome.baselineOdds)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Bets</p>
                  <p className="font-semibold">{outcome.numBets.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Staked</p>
                  <p className="font-semibold">Ɖ{formatDiamonds(outcome.diamondsStaked)}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-sm text-white/80">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Implied probability</span>
                  <span className="text-white">
                    {impliedProbabilityFromOdds(outcome.baselineOdds)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: fillWidth }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
