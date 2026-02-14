import React, { useMemo, useState } from "react";
import { OutcomeStatusPills } from "./components/OutcomeStatusPills";
import { OutcomeIdentity } from "./components/OutcomeIdentity";
import { formatCurrency, formatOdds, formatPercent } from "./utils/format";
import type { LiveBet, Pool } from "./types";
import { USE_MARKET_LAYOUT_V2 } from "./flags";
import { getOutcomeRankings } from "./utils/outcomeStats";

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

export function PoolAnalytics(props: PoolAnalyticsProps) {
  if (USE_MARKET_LAYOUT_V2) {
    return <LiveBetsAnalytics {...props} />;
  }
  return <LegacyPoolAnalytics {...props} />;
}

function LiveBetsAnalytics({ pool, liveBets }: PoolAnalyticsProps) {
  const [teamFilter, setTeamFilter] = useState<string>("all");

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
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 text-white">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Live Bets</p>
        <h3 className="text-xl font-semibold">{pool.title}</h3>
        <p className="text-sm text-white/60">
          Track wagers as they land. Filter by team to focus on a single outcome.
        </p>
      </header>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">Recent Volume</p>
        <p className="mt-1 text-lg font-semibold text-white">
          {liveBetsForPool.length} bets · {formatCurrency(liveVolume)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTeamFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
            teamFilter === "all"
              ? "bg-emerald-500 text-slate-950"
              : "border border-white/20 text-white/80 hover:border-white/40"
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
                ? "bg-white/10 text-emerald-200"
                : "border border-white/20 text-white/80 hover:border-white/40"
            }`}
          >
            {outcome.teamName}
          </button>
        ))}
      </div>

      <div className="mt-4 live-bets-stream">
        <div className="space-y-2">
          {liveBetsForPool.length === 0 ? (
            <p className="text-sm text-white/60">No live bets yet for this filter.</p>
          ) : (
            liveBetsForPool.map((bet) => (
              <article
                key={bet.id}
                className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white"
                    style={
                      bet.teamColor
                        ? { backgroundColor: bet.teamColor, color: "#050505" }
                        : { backgroundColor: "rgba(15,23,42,0.6)" }
                    }
                  >
                    {getInitials(bet.teamName)}
                  </div>
                  <div>
                    <OutcomeIdentity
                      teamName={bet.teamName}
                      driverName={bet.driverName}
                      teamColor={bet.teamColor}
                      hideSwatch
                      primaryClassName="text-xs font-semibold text-white"
                      secondaryClassName="text-[10px] text-white/60"
                    />
                    <p className="text-[10px] text-white/40">
                      Bet #{bet.id.slice(0, 6)} · {formatRelativeTime(bet.placedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-3 text-xs text-white/80 sm:max-w-xs">
                  <div>
                    <p className="text-xs text-white/50">Amount</p>
                    <p className="font-semibold text-white">{formatCurrency(bet.amount)}</p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-xs text-white/50">Odds</p>
                    <p className="font-semibold text-white">{formatOdds(bet.oddsAtPlacement)}</p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function LegacyPoolAnalytics({ pool, liveBets }: PoolAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [timeframe, setTimeframe] = useState<Timeframe>("60m");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const sortedOutcomes = useMemo(
    () => [...pool.outcomes].sort((a, b) => b.diamondsStaked - a.diamondsStaked),
    [pool.outcomes]
  );
  const { favouriteId, bestPayoutId } = useMemo(
    () => getOutcomeRankings(pool.outcomes),
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
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 text-white">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pool Analytics</p>
          <h3 className="text-xl font-semibold">{pool.title}</h3>
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
                  : "border border-white/20 text-white/80 hover:border-white/40"
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
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Pool Stake</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(pool.totalStake)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Total Bets</p>
              <p className="mt-1 text-lg font-semibold">{pool.totalBets.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Last Updated</p>
              <p className="mt-1 text-lg font-semibold">{pool.lastUpdatedLabel}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Rake</p>
              <p className="mt-1 text-lg font-semibold">{formatPercent(pool.rakePercent / 100)}</p>
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
                    ? "bg-white/10 text-emerald-200"
                    : "border border-white/20 text-white/70 hover:border-white/40"
                }`}
              >
                {option.label}
              </button>
            ))}
            <p className="text-xs text-white/40">Timeframe: {timeframe}</p>
          </div>

          <div className="space-y-3">
            {sortedOutcomes.map((outcome) => {
              const sharePercent = Math.max(outcome.marketShare * 100, 0);
              const fillWidth = `${Math.min(sharePercent, 100).toFixed(1)}%`;
              const isFavourite = favouriteId === outcome.id;
              const isBestPayout = bestPayoutId === outcome.id;
              return (
                <div
                  key={outcome.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                >
                    <div className="flex items-center gap-3">
                      <OutcomeIdentity
                        teamName={outcome.teamName}
                        driverName={outcome.driverName}
                        teamColor={outcome.teamColor}
                        className="rounded-xl bg-black/30 px-3 py-2"
                        primaryClassName="text-sm font-semibold text-white"
                        secondaryClassName="text-xs text-white/60"
                      />
                      <OutcomeStatusPills
                        isFavourite={isFavourite}
                        isBestPayout={isBestPayout}
                      />
                    </div>

                  <div className="grid flex-1 grid-cols-2 gap-3 text-sm text-white/80 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-white/50">Total Amount Bet</p>
                      <p className="font-semibold text-white">{formatCurrency(outcome.diamondsStaked)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Share</p>
                      <p className="font-semibold text-white">{formatPercent(outcome.marketShare)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Odds</p>
                      <p className="font-semibold text-white">{formatOdds(outcome.baselineOdds)}</p>
                    </div>
                    <div />
                  </div>

                  <div className="w-full md:w-48">
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: fillWidth,
                          backgroundColor: outcome.teamColor ?? "#38bdf8"
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-white/60">
                      Pool share {formatPercent(outcome.marketShare)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "live" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-white/80">
              Live feed of wagers for this pool. Updates as bets are placed and priced.
            </p>
            <p className="text-xs text-white/50">
              {liveBetsForPool.length} bets · {formatCurrency(liveVolume)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTeamFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                teamFilter === "all"
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-white/20 text-white/80 hover:border-white/40"
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
                    ? "bg-white/10 text-emerald-200"
                    : "border border-white/20 text-white/80 hover:border-white/40"
                }`}
              >
                {outcome.teamName}
              </button>
            ))}
          </div>

          <div className="live-bets-stream">
            <div className="space-y-2">
              {liveBetsForPool.length === 0 && (
                <p className="text-sm text-white/60">No live bets yet for this filter.</p>
              )}

              {liveBetsForPool.map((bet) => (
                <div
                  key={bet.id}
                  className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={
                        bet.teamColor
                          ? { backgroundColor: bet.teamColor, color: "#050505" }
                          : { backgroundColor: "rgba(15,23,42,0.6)" }
                      }
                    >
                      {getInitials(bet.teamName)}
                    </div>
                    <OutcomeIdentity
                      teamName={bet.teamName}
                      driverName={bet.driverName}
                      teamColor={bet.teamColor}
                      hideSwatch
                      primaryClassName="text-xs font-semibold text-white"
                      secondaryClassName="text-[10px] text-white/60"
                    />
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-3 text-xs text-white/80 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-white/50">Amount</p>
                      <p className="font-semibold text-white">{formatCurrency(bet.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Odds</p>
                      <p className="font-semibold text-white">{formatOdds(bet.oddsAtPlacement)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50">Placed</p>
                      <p className="font-semibold text-white">{formatRelativeTime(bet.placedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
