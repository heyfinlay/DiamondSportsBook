import React, { useMemo, useState } from "react";
import { TrendPill } from "./components/TrendPill";
import { formatDiamonds, formatOdds, formatPercent } from "./utils/format";
import type { LiveBet, Pool } from "./types";

interface PoolAnalyticsProps {
  pool: Pool;
  liveBets: LiveBet[];
}

type AnalyticsTab = "overview" | "live";
type Timeframe = "60m" | "24h";

const timeframeOptions: { key: Timeframe; label: string }[] = [
  { key: "60m", label: "Last 60m" },
  { key: "24h", label: "Last 24h" }
];

const Sparkline = () => (
  <svg viewBox="0 0 120 40" className="h-10 w-28 text-emerald-400">
    <polyline
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      points="0,30 20,25 40,28 60,18 80,22 100,14 120,18"
      className="opacity-80"
    />
  </svg>
);

const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "--";
  const seconds = Math.max(Math.floor(diffMs / 1000), 0);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getInitials = (name: string) => {
  if (!name) return "--";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function PoolAnalytics({ pool, liveBets }: PoolAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [timeframe, setTimeframe] = useState<Timeframe>("60m");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const sortedOutcomes = useMemo(
    () => [...pool.outcomes].sort((a, b) => b.diamondsStaked - a.diamondsStaked),
    [pool.outcomes]
  );

  const liveBetsForPool = useMemo(
    () =>
      liveBets.filter(
        (bet) =>
          bet.poolId === pool.id && (teamFilter === "all" || bet.teamName === teamFilter)
      ),
    [liveBets, pool.id, teamFilter]
  );

  const liveVolume = liveBetsForPool.reduce((sum, bet) => sum + bet.amount, 0);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-slate-50 shadow-[0_0_32px_rgba(8,15,30,0.35)] md:p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pool Analytics</p>
          <h3 className="text-xl font-semibold text-white">{pool.title}</h3>
        </div>
        <div className="flex gap-2">
          {(["overview", "live"] as AnalyticsTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                activeTab === tab
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-700 text-slate-200 hover:border-slate-500"
              }`}
            >
              {tab === "overview" ? "Overview" : "Live Bets"}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "overview" && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Pool Stake</p>
              <p className="mt-1 text-lg font-semibold text-white">Ɖ{formatDiamonds(pool.totalStake)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total Bets</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {pool.totalBets.toLocaleString("en-US")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Last Updated</p>
              <p className="mt-1 text-lg font-semibold text-white">{pool.lastUpdatedLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Rake</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {formatPercent(pool.rakePercent / 100)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {timeframeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTimeframe(option.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                  timeframe === option.key
                    ? "bg-slate-800 text-emerald-200"
                    : "border border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {option.label}
              </button>
            ))}
            <p className="text-xs text-slate-500">Timeframe: {timeframe}</p>
          </div>

          <div className="space-y-3">
            {sortedOutcomes.map((outcome) => {
              const sharePercent = Math.max(outcome.marketShare * 100, 0);
              const fillWidth = `${Math.min(sharePercent, 100).toFixed(1)}%`;
              return (
                <div
                  key={outcome.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-slate-800 px-3 py-2">
                      <p className="text-sm font-semibold text-white">{outcome.teamName}</p>
                      <p className="text-xs text-slate-400">{outcome.driverName}</p>
                    </div>
                    <Sparkline />
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-3 text-sm text-slate-200 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-400">Staked</p>
                      <p className="font-semibold text-white">Ɖ{formatDiamonds(outcome.diamondsStaked)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Share</p>
                      <p className="font-semibold text-white">{formatPercent(outcome.marketShare)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Odds</p>
                      <p className="font-semibold text-white">{formatOdds(outcome.baselineOdds)}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <TrendPill delta={outcome.trendDelta} />
                    </div>
                  </div>

                  <div className="w-full md:w-48">
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: fillWidth }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Pool share {formatPercent(outcome.marketShare)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "live" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-sm text-slate-200">
              Live feed of wagers for this pool. Updates as bets are placed and priced.
            </p>
            <p className="text-xs text-slate-500">
              {liveBetsForPool.length} bets · Ɖ{formatDiamonds(liveVolume)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTeamFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                teamFilter === "all"
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-700 text-slate-200 hover:border-slate-500"
              }`}
            >
              All
            </button>
            {pool.outcomes.map((outcome) => (
              <button
                key={outcome.id}
                type="button"
                onClick={() => setTeamFilter(outcome.teamName)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                  teamFilter === outcome.teamName
                    ? "bg-slate-800 text-emerald-200"
                    : "border border-slate-700 text-slate-200 hover:border-slate-500"
                }`}
              >
                {outcome.teamName}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {liveBetsForPool.length === 0 && (
              <p className="text-sm text-slate-400">No live bets yet for this filter.</p>
            )}

            {liveBetsForPool.map((bet) => (
              <div
                key={bet.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                    {getInitials(bet.teamName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{bet.teamName}</p>
                    {bet.driverName && <p className="text-xs text-slate-400">{bet.driverName}</p>}
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-3 text-sm text-slate-200 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400">Amount</p>
                    <p className="font-semibold text-white">Ɖ{formatDiamonds(bet.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Odds at placement</p>
                    <p className="font-semibold text-white">{formatOdds(bet.oddsAtPlacement)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Placed</p>
                    <p className="font-semibold text-white">{formatRelativeTime(bet.placedAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {bet.amount >= 25000 && (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                      High Roller
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
