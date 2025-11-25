import React from "react";
import { OutcomeStatusPills } from "./components/OutcomeStatusPills";
import { OutcomeIdentity } from "./components/OutcomeIdentity";
import { formatCurrency, formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
import type { Pool, PoolStatus } from "./types";

interface MarketPoolsGridProps {
  pools: Pool[];
  onSelectPool?: (poolId: string) => void;
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

export function MarketPoolsGrid({ pools, onSelectPool }: MarketPoolsGridProps) {
  return (
    <section className="w-full rounded-3xl border border-white/10 bg-black/30 px-4 py-6 text-slate-50 shadow-[0_0_30px_rgba(3,7,18,0.5)] md:px-6 lg:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">DayBreak Grand Prix</p>
          <h2 className="text-2xl font-semibold leading-tight text-white md:text-3xl">
            Active Markets
          </h2>
        </div>
        <p className="text-xs text-white/50">
          {pools.length} pool{pools.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {pools.map((pool) => {
          const sorted = [...pool.outcomes].sort((a, b) => b.marketShare - a.marketShare);
          const { favouriteId, bestPayoutId } = getOutcomeRankings(pool.outcomes);
          const distributionLabel = `${pool.outcomes.length} outcome${
            pool.outcomes.length === 1 ? "" : "s"
          }`;
          const racePrefix = pool.title.split("·")[0]?.trim() ?? pool.title;

          const leadingOutcome = sorted[0];
          return (
            <article
              key={pool.id}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/40 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold leading-tight text-white">
                    {pool.title}
                  </h3>
                  <p className="text-xs text-white/60">{pool.timeRemainingLabel}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${statusClasses[pool.status]}`}
                >
                  {statusLabel[pool.status]}
                </span>
              </div>

              <div className="mb-3 grid gap-3 text-sm text-white sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-white/50">Total Pool</span>
                    <span className="font-semibold">{formatCurrency(pool.totalStake)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/50">Bets</span>
                    <span className="block font-semibold">
                      {pool.totalBets.toLocaleString("en-US")}
                    </span>
                  </div>
                </div>
                {leadingOutcome ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                      <span>Leading Outcome</span>
                      <span>{formatPercent(leadingOutcome.marketShare)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <OutcomeIdentity
                        teamName={leadingOutcome.teamName}
                        driverName={leadingOutcome.driverName}
                        teamColor={leadingOutcome.teamColor}
                        hideSwatch
                        primaryClassName="text-sm font-semibold text-white"
                        secondaryClassName="text-xs text-white/60"
                      />
                      <div className="text-right">
                        <p className="text-xs text-white/50">Odds</p>
                        <p className="text-sm font-semibold text-white">
                          {formatOdds(leadingOutcome.baselineOdds)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60">
                    Market will show leaders once bets arrive.
                  </div>
                )}
              </div>

              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/50">
                <span>Market Distribution</span>
                <span>{distributionLabel}</span>
              </div>

              <div className="flex flex-col gap-3">
                {sorted.slice(0, 5).map((outcome, i) => {
                  if (i === 0) console.log("ROW OUTCOME", outcome);
                  const sharePercent = Math.max(outcome.marketShare * 100, 0);
                  const isFavourite = outcome.id === favouriteId;
                  const isBestPayout = outcome.id === bestPayoutId;
                  const fillWidth = `${Math.min(sharePercent, 100).toFixed(1)}%`;
                  return (
                    <div key={outcome.id} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 overflow-hidden">
                          <OutcomeIdentity
                            teamName={outcome.teamName}
                            driverName={outcome.driverName}
                            teamColor={outcome.teamColor}
                            className="items-start"
                            primaryClassName="truncate text-sm font-semibold text-white"
                            secondaryClassName="text-xs text-white/50"
                          />

                          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: fillWidth,
                                backgroundColor: outcome.teamColor ?? "#38bdf8"
                              }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-white/50">
                            Total Bet: {formatCurrency(outcome.diamondsStaked)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-right">
                          <p className="text-sm font-semibold text-white">{formatOdds(outcome.baselineOdds)}</p>
                          <p className="text-xs text-white/60">Share: {formatPercent(outcome.marketShare)}</p>
                          <OutcomeStatusPills isFavourite={isFavourite} isBestPayout={isBestPayout} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                <div className="text-xs text-white/50">View full market · {racePrefix}</div>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-emerald-400"
                  onClick={() => onSelectPool?.(pool.id)}
                >
                  View Market
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
