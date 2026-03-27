import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatOdds, formatPercent } from "./utils/format";
import { getOutcomeRankings } from "./utils/outcomeStats";
import type { LiveBet, Pool } from "./types";

interface PoolDetailsProps {
  pool: Pool;
  liveBets: LiveBet[];
  onOutcomeSelect?: (outcomeId: string) => void;
  onOpenBetSlip?: (poolId: string, outcomeId: string) => void;
}

const formatTrend = (delta: number) => `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;

export function PoolDetails({ pool, liveBets, onOutcomeSelect, onOpenBetSlip }: PoolDetailsProps) {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);

  const { favouriteId, bestPayoutId } = useMemo(
    () => getOutcomeRankings(pool.outcomes),
    [pool.outcomes]
  );

  const topWagersByOutcome = useMemo(() => {
    const map = new Map<string, number>();
    liveBets.forEach((bet) => {
      map.set(bet.outcomeId, (map.get(bet.outcomeId) ?? 0) + bet.amount);
    });
    return map;
  }, [liveBets]);

  const handleSelect = (outcomeId: string) => {
    setSelectedOutcomeId(outcomeId);
    onOutcomeSelect?.(outcomeId);
    onOpenBetSlip?.(pool.id, outcomeId);
  };

  const sortedOutcomes = [...pool.outcomes].sort((a, b) => b.marketShare - a.marketShare);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-headline text-3xl font-extrabold uppercase tracking-[0.06em] text-white">
            Outcome Intelligence
          </h2>
          <p className="mt-2 text-sm text-on-subtle">
            Select an outcome to launch the slip. Pool share and live momentum update with each new wager.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="prismatic-chip" data-active="true">
            Win
          </button>
          <button type="button" className="prismatic-chip">
            Pool Share
          </button>
          <button type="button" className="prismatic-chip">
            Live Flow
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {sortedOutcomes.map((outcome, index) => {
          const sharePercent = Math.max(outcome.marketShare * 100, 0);
          const liveVolume = topWagersByOutcome.get(outcome.id) ?? 0;
          const isPositive = outcome.trendDelta >= 0;
          const isSelected = selectedOutcomeId === outcome.id;
          return (
            <button
              key={outcome.id}
              type="button"
              onClick={() => handleSelect(outcome.id)}
              className={`grid w-full gap-4 border p-4 text-left transition ${
                isSelected
                  ? "border-primary-container/45 bg-surface-high"
                  : "border-white/10 bg-surface-low/85 hover:bg-surface"
              }`}
            >
              <div className="grid gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_7rem] sm:items-start">
                <div className="border-r border-white/10 pr-4 text-center">
                  <span className="font-headline text-3xl font-extrabold italic text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary-dim">
                      {outcome.shortLabel ?? "—"}
                    </span>
                    {favouriteId === outcome.id ? (
                      <span className="text-[0.58rem] uppercase tracking-[0.16em] text-on-subtle">Market Lead</span>
                    ) : null}
                    {bestPayoutId === outcome.id ? (
                      <span className="text-[0.58rem] uppercase tracking-[0.16em] text-danger">Edge</span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 break-words font-headline text-xl font-extrabold uppercase tracking-[0.04em] text-white sm:text-[1.35rem]">
                    {outcome.primaryLabel}
                  </h3>
                  {outcome.secondaryLabel ? (
                    <p className="mt-1 text-[0.7rem] uppercase tracking-[0.14em] text-on-subtle">
                      {outcome.secondaryLabel}
                    </p>
                  ) : null}
                </div>

                <div className="border border-white/10 bg-surface-high px-3 py-3 text-center">
                  <p className="font-headline text-2xl font-extrabold text-primary-dim sm:text-3xl">{formatOdds(outcome.baselineOdds)}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_6rem_6rem] sm:items-end">
                <div className="grid gap-2">
                  <div className="flex items-center gap-[2px]">
                    {Array.from({ length: 10 }).map((_, barIndex) => (
                      <span
                        key={barIndex}
                        className="h-3.5 flex-1 border border-white/10"
                        style={{
                          backgroundColor:
                            barIndex < Math.round(sharePercent / 10)
                              ? outcome.accentColor ?? "#00f2ff"
                              : "rgba(50,53,57,0.45)"
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[0.66rem] uppercase tracking-[0.14em] text-on-subtle">
                    <span>Share</span>
                    <span className="font-semibold text-white">{formatPercent(outcome.marketShare)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">Flow</p>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {liveVolume > 0 ? `${Math.round(liveVolume).toLocaleString()}` : "Quiet"}
                  </p>
                </div>

                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">Trend</p>
                  <div className={`mt-1.5 inline-flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-primary-dim" : "text-danger"}`}>
                    {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    <span>{formatTrend(outcome.trendDelta)}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
