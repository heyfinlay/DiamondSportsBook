import React, { useMemo } from "react";
import { Activity, BrainCircuit } from "lucide-react";
import { formatCurrency, formatPercent } from "./utils/format";
import type { LiveBet, Pool } from "./types";

interface PoolAnalyticsProps {
  pool: Pool;
  liveBets: LiveBet[];
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function PoolAnalytics({ pool, liveBets }: PoolAnalyticsProps) {
  const sortedOutcomes = useMemo(
    () => [...pool.outcomes].sort((a, b) => b.diamondsStaked - a.diamondsStaked),
    [pool.outcomes]
  );

  const liveVolume = liveBets.reduce((sum, bet) => sum + bet.amount, 0);
  const volatility = sortedOutcomes.length
    ? sortedOutcomes.reduce((sum, outcome) => sum + Math.abs(outcome.trendDelta), 0) / sortedOutcomes.length
    : 0;
  const concentration = sortedOutcomes[0]?.marketShare ?? 0;
  const topSignal = [...sortedOutcomes].sort((a, b) => b.trendDelta - a.trendDelta)[0];
  const marketStatus = liveVolume > pool.totalStake * 0.08 ? "High Liquidity" : "Balanced Flow";

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_22rem]">
      <div className="prismatic-card p-6 sm:p-8">
        <div className="relative z-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-headline text-3xl font-extrabold uppercase tracking-[0.06em] text-white">
                Pool Volume Distribution
              </h3>
              <p className="mt-3 text-sm uppercase tracking-[0.16em] text-on-subtle">
                Analyzing {formatCurrency(pool.totalStake)} global volume
              </p>
            </div>
            <p className="prismatic-kicker text-primary-dim">Market Status: {marketStatus}</p>
          </div>

          <div className="mt-10 space-y-6">
            {sortedOutcomes.slice(0, 3).map((outcome) => {
              const width = `${clamp(outcome.marketShare * 100, 4, 100)}%`;
              return (
                <div key={outcome.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-2.5 w-2.5"
                        style={{ backgroundColor: outcome.accentColor ?? "#00f2ff" }}
                      />
                      <p className="font-headline text-sm font-bold uppercase tracking-[0.08em] text-white">
                        {outcome.primaryLabel}
                      </p>
                    </div>
                    <span className="font-semibold text-primary-dim">
                      {formatPercent(outcome.marketShare)} ({formatCurrency(outcome.diamondsStaked)})
                    </span>
                  </div>
                  <div className="flex gap-[3px]">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <span
                        key={index}
                        className="h-5 flex-1 border border-white/10"
                        style={{
                          background:
                            index < Math.ceil(clamp(outcome.marketShare * 10, 1, 10))
                              ? `linear-gradient(180deg, ${outcome.accentColor ?? "#00f2ff"}88 0%, ${outcome.accentColor ?? "#00f2ff"}33 100%)`
                              : "rgba(40,42,46,0.55)"
                        }}
                      />
                    ))}
                  </div>
                  <div className="h-1 bg-surface-highest">
                    <div className="h-full" style={{ width, backgroundColor: outcome.accentColor ?? "#00f2ff" }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border border-white/10 bg-surface px-5 py-5">
              <p className="prismatic-kicker">Sharpe Ratio</p>
              <p className="mt-3 font-headline text-4xl font-extrabold text-white">
                {clamp(4 + concentration * 3, 1, 9).toFixed(2)}
              </p>
            </div>
            <div className="border border-white/10 bg-surface px-5 py-5">
              <p className="prismatic-kicker">Volatility Index</p>
              <p className="mt-3 font-headline text-4xl font-extrabold text-white">
                {volatility > 2 ? "High" : volatility > 1 ? "Medium" : "Low"}
              </p>
            </div>
            <div className="border border-white/10 bg-surface px-5 py-5">
              <p className="prismatic-kicker">Whale Activity</p>
              <p className="mt-3 font-headline text-4xl font-extrabold text-primary-dim">
                {liveBets.length >= 6 ? "High" : liveBets.length >= 3 ? "Warm" : "Quiet"}
              </p>
            </div>
            <div className="border border-white/10 bg-surface px-5 py-5">
              <p className="prismatic-kicker">Market Sentiment</p>
              <p className="mt-3 font-headline text-4xl font-extrabold text-white">
                {Math.round(clamp(concentration * 100 + 48, 50, 99))}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <section className="prismatic-card p-6">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary-dim" />
              <h3 className="font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white">
                Real-Time Telemetry
              </h3>
            </div>
            <div className="mt-8 space-y-6">
              <TelemetryMetric
                label="Pool Depth"
                value="Optimum"
                tone="text-primary-dim"
                fill={clamp(concentration * 100 + 38, 20, 95)}
              />
              <TelemetryMetric
                label="Volatility Spread"
                value={volatility > 2 ? "Critical" : volatility > 1 ? "Elevated" : "Stable"}
                tone={volatility > 2 ? "text-danger" : "text-primary-dim"}
                fill={clamp(volatility * 35, 18, 92)}
              />
              <TelemetryMetric
                label="Capital Stability"
                value={liveVolume > 0 ? "Steady" : "Idle"}
                tone="text-primary-dim"
                fill={clamp(100 - volatility * 22, 24, 95)}
              />
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-surface-lowest p-6">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-5 w-5 text-primary-dim" />
            <p className="prismatic-kicker text-white">A.I. Prediction Engine</p>
          </div>
          <div className="mt-6 flex gap-4">
            <div className="inline-flex h-14 w-14 items-center justify-center bg-primary-container text-on-primary">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <p className="font-headline text-xl font-extrabold uppercase tracking-[0.05em] text-white">
                {topSignal?.primaryLabel ?? "Signal Pending"}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary-dim">
                {topSignal ? `${topSignal.trendDelta >= 0 ? "+" : ""}${topSignal.trendDelta.toFixed(1)}% in recent flow` : "Waiting for live flow"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

const TelemetryMetric = ({
  label,
  value,
  tone,
  fill
}: {
  label: string;
  value: string;
  tone: string;
  fill: number;
}) => (
  <div>
    <div className="flex items-center justify-between gap-4">
      <p className="font-headline text-sm font-bold uppercase tracking-[0.08em] text-on-subtle">{label}</p>
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
    </div>
    <div className="mt-3 h-1.5 bg-white/10">
      <div className="h-full bg-primary-container" style={{ width: `${fill}%` }} />
    </div>
  </div>
);

export default PoolAnalytics;
