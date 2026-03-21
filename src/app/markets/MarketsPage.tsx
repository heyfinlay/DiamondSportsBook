import { Link, useNavigate } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, Database, Settings, Waves, LifeBuoy } from "lucide-react";
import { fetchChampionshipSeasons } from "@domains/championship/api/championshipApi";
import { useDriverStandings } from "@domains/standings/api/standingsApi";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys } from "@lib/query/keys";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import PrismaticSideRail from "@app/components/PrismaticSideRail";
import type { Pool, PoolStatus } from "../../features/markets/types";
import { formatCurrency } from "../../features/markets/utils/format";

const statusOptions: Array<{ key: "all" | PoolStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closing_soon", label: "Closing Soon" },
  { key: "closed", label: "Closed" },
  { key: "settled", label: "Settled" }
];

const formatTrend = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const getPoolTrend = (pool: Pool) => {
  if (!pool.outcomes.length) return 0;
  return pool.outcomes.reduce((sum, outcome) => sum + outcome.trendDelta, 0) / pool.outcomes.length;
};

const getPoolSentiment = (pool: Pool) => {
  const trend = getPoolTrend(pool);
  if (trend >= 0.8) return { label: "Bullish", className: "text-primary-dim" };
  if (trend <= -0.8) return { label: "Bearish", className: "text-danger" };
  return { label: "Balanced", className: "text-on-subtle" };
};

const getVaultStatus = (pool: Pool) => {
  if (pool.status === "open") return "Inspect";
  if (pool.status === "closing_soon") return "Watch";
  if (pool.status === "closed") return "Locked";
  return "Settled";
};

const MarketsPage = () => {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const setBetslipSelection = useBettingStore((state) => state.setBetslipSelection);

  const poolsQuery = useQuery({
    queryKey: marketKeys.pools(),
    queryFn: fetchUiPools
  });

  const pools = poolsQuery.data ?? [];
  const [statusFilter, setStatusFilter] = useState<"all" | PoolStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"closing" | "pool">("pool");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredPools = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    const byStatus =
      statusFilter === "all" ? pools : pools.filter((pool) => pool.status === statusFilter);

    const bySearch = query
      ? byStatus.filter((pool) => pool.title.toLowerCase().includes(query))
      : byStatus;

    return [...bySearch].sort((a, b) => {
      if (sortKey === "pool") return b.totalStake - a.totalStake;
      const aTime = (a as { timeRemainingMs?: number }).timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
      const bTime = (b as { timeRemainingMs?: number }).timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }, [deferredSearchQuery, pools, sortKey, statusFilter]);

  const featuredPool = filteredPools[0] ?? pools[0] ?? null;
  const featuredOutcomes = useMemo(
    () =>
      [...(featuredPool?.outcomes ?? [])]
        .sort((a, b) => b.marketShare - a.marketShare)
        .slice(0, 2),
    [featuredPool]
  );

  const seasonsQuery = useQuery({
    queryKey: ["championship-seasons"],
    queryFn: fetchChampionshipSeasons
  });
  const activeSeasonId = useMemo(() => {
    const seasons = seasonsQuery.data ?? [];
    return seasons.find((season) => season.status === "active")?.id ?? seasons[0]?.id;
  }, [seasonsQuery.data]);
  const standingsQuery = useDriverStandings(activeSeasonId);
  const featuredStandings = (standingsQuery.data ?? []).slice(0, 4);

  const totalHandle = pools.reduce((sum, pool) => sum + pool.totalStake, 0);
  const openPools = pools.filter((pool) => pool.status === "open" || pool.status === "closing_soon").length;

  const handleOutcomeSelect = (poolId: string, poolTitle: string, outcome: (typeof pools)[number]["outcomes"][number]) => {
    setBetslipSelection({
      marketId: poolId,
      marketName: poolTitle,
      eventTitle: null,
      outcomeId: outcome.id,
      outcomeLabel: `${outcome.teamName} — ${outcome.driverName}`,
      minStake: 0,
      maxStake: 0,
      stake: 0
    });
    navigate(`/market/${poolId}`);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <PrismaticSideRail
        title="Live Intelligence"
        subtitle="High-Frequency Data"
        activeKey="whale_movements"
        items={[
          { key: "whale_movements", label: "Whale Movements", icon: Waves },
          { key: "prismatic_shifts", label: "Prismatic Shifts", icon: Activity },
          { key: "market_volume", label: "Market Volume", icon: Database },
          { key: "settings", label: "Settings", icon: Settings },
          { key: "support", label: "Support", icon: LifeBuoy }
        ]}
        ctaLabel="View Global Analytics"
        ctaTo="/standings"
      />

      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_21rem]">
          <div className="prismatic-card min-h-[28rem] p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(225,253,255,0.08),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_50%)] opacity-80" />
            <div className="absolute right-0 top-0 h-full w-[42%] bg-[radial-gradient(circle_at_top,rgba(0,242,255,0.2),transparent_55%),linear-gradient(180deg,rgba(0,242,255,0.06),transparent_65%)] opacity-90" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-2 border border-primary-container/30 bg-primary-container/10 px-3 py-1">
                  <span className="inline-flex h-2 w-2 bg-primary-container" />
                  <span className="prismatic-kicker text-primary-dim">Live Intelligence Active</span>
                </div>

                <div className="mt-8">
                  <p className="prismatic-kicker">Prime Market</p>
                  <h1 className="mt-3 font-headline text-4xl font-extrabold uppercase tracking-[0.03em] text-white sm:text-5xl lg:text-6xl">
                    {featuredPool ? featuredPool.title : "Diamond Sportsbook"}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-on-subtle sm:text-base">
                    Pool-based pricing updates in real time. Lower share means higher payout, while volume signals conviction across the vault.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.7rem] uppercase tracking-[0.18em] text-on-subtle">
                    <span>{poolsQuery.isLoading ? "Syncing live pools" : `${pools.length} monitored markets`}</span>
                    <span className="inline-flex h-1 w-1 bg-primary-container" />
                    <span>{openPools} open now</span>
                    {featuredPool?.timeRemainingLabel ? (
                      <>
                        <span className="inline-flex h-1 w-1 bg-danger" />
                        <span>{featuredPool.timeRemainingLabel}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]">
                  {featuredOutcomes.map((outcome) => (
                    <div key={outcome.id} className="flex min-h-[10.5rem] flex-col justify-between border border-white/10 bg-surface-highest/60 px-5 py-5 backdrop-blur-xl">
                      <div className="min-w-0">
                        <p className="prismatic-kicker text-[0.58rem]">{outcome.teamName}</p>
                        <p className="mt-2 line-clamp-2 min-h-[3.5rem] font-headline text-lg font-extrabold uppercase tracking-[0.04em] text-white sm:text-xl">
                          {outcome.driverName}
                        </p>
                      </div>
                      <div>
                        <p className="font-headline text-3xl font-extrabold text-white sm:text-4xl">{outcome.baselineOdds.toFixed(2)}</p>
                        <p className="mt-1 text-[0.66rem] uppercase tracking-[0.14em] text-on-subtle">
                          {Math.round(outcome.marketShare * 100)}% share
                        </p>
                      </div>
                      <div className="mt-4 h-1 bg-white/10">
                        <div
                          className="h-full bg-primary-container"
                          style={{ width: `${Math.min(Math.max(outcome.marketShare * 100, 10), 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex min-h-[10.5rem] items-end">
                    {featuredPool ? (
                      <Link to={`/market/${featuredPool.id}`} className="prismatic-button prismatic-button-primary w-full px-8 py-5">
                        Enter Vault
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="border border-primary-container/30 bg-[linear-gradient(135deg,rgba(225,253,255,0.16),rgba(0,242,255,0.14))] px-6 py-6 text-left shadow-[0_0_36px_rgba(0,242,255,0.12)]">
                  <p className="prismatic-kicker text-on-primary/80">Total Pool Liquidity</p>
                  <p className="mt-3 font-headline text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    {formatCurrency(totalHandle)}
                  </p>
                  <p className="mt-3 text-[0.7rem] uppercase tracking-[0.14em] text-on-primary/80">
                    {featuredPool ? `${featuredPool.totalBets.toLocaleString()} active tickets in focus` : "Waiting for active pool data"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="prismatic-kicker text-white">Current Standings</h2>
              <Link to="/wagers" className="prismatic-kicker text-primary-dim transition hover:text-white">
                Live Board
              </Link>
            </div>
            {featuredStandings.length ? (
              featuredStandings.map((driver) => (
                <div key={driver.driver_id} className="prismatic-glass flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center bg-surface-highest font-headline text-xl font-extrabold text-white">
                      {String(driver.position).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.6rem] uppercase tracking-[0.16em] text-on-subtle">
                        {driver.team_name}
                      </p>
                      <p className="mt-1 truncate font-headline text-lg font-extrabold uppercase tracking-[0.05em] text-white">
                        {driver.driver_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-headline text-2xl font-extrabold text-primary-dim">
                      {driver.points.toFixed(0)}
                    </p>
                    <p className="prismatic-kicker text-[0.58rem]">Pts</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="prismatic-glass p-5 text-sm text-on-subtle">
                {standingsQuery.isLoading ? "Loading standings…" : "Standings data will appear here once the active season is available."}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="prismatic-metric px-5 py-4">
            <p className="prismatic-kicker">Live Pools</p>
            <p className="mt-2 font-headline text-3xl font-extrabold text-white">{pools.length}</p>
          </div>
          <div className="prismatic-metric px-5 py-4">
            <p className="prismatic-kicker">Open Now</p>
            <p className="mt-2 font-headline text-3xl font-extrabold text-white">{openPools}</p>
          </div>
          <div className="prismatic-metric px-5 py-4">
            <p className="prismatic-kicker">Total Handle</p>
            <p className="mt-2 font-headline text-3xl font-extrabold text-white">{formatCurrency(totalHandle)}</p>
          </div>
        </section>

        {!sessionLoading && !user ? <AuthCtaBanner /> : null}

        {poolsQuery.isLoading ? (
          <div className="prismatic-card px-5 py-4 text-sm text-on-subtle">Loading live markets…</div>
        ) : null}

        {poolsQuery.isError ? (
          <div className="border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
            Unable to load markets right now. Refresh to try again.
          </div>
        ) : null}

        <section className="prismatic-card p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="prismatic-kicker">Prime Markets</p>
              <h2 className="mt-2 font-headline text-3xl font-extrabold uppercase tracking-[0.06em] text-white">
                Active Vault Board
              </h2>
            </div>

            <div className="flex flex-col gap-4 xl:items-end">
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status.key}
                    type="button"
                    onClick={() => setStatusFilter(status.key)}
                    className="prismatic-chip"
                    data-active={statusFilter === status.key}
                  >
                    {status.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="min-w-[18rem] border border-white/10 bg-surface-low px-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search markets"
                    className="prismatic-input"
                  />
                </div>
                <div className="border border-white/10 bg-surface-low px-4">
                  <label className="prismatic-kicker block pt-3 text-[0.56rem]">Sort</label>
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as "closing" | "pool")}
                    className="w-full bg-transparent pb-3 pt-2 text-sm text-white outline-none"
                  >
                    <option value="pool">Highest Pool</option>
                    <option value="closing">Closing Soon</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {filteredPools.length > 0 ? (
          <MarketPoolsGrid
            pools={filteredPools}
            onSelectPool={(poolId) => navigate(`/market/${poolId}`)}
            onSelectOutcome={handleOutcomeSelect}
          />
        ) : (
          !poolsQuery.isLoading && (
            <div className="prismatic-card flex flex-wrap items-center gap-4 p-8">
              <div className="flex-1">
                <p className="font-headline text-xl font-extrabold uppercase tracking-[0.08em] text-white">
                  Market board coming online
                </p>
                <p className="mt-2 text-sm text-on-subtle">
                  Admin tools will seed the next tote shortly. Check back when the next event opens betting.
                </p>
              </div>
              <Link to="/account" className="prismatic-button prismatic-button-secondary">
                Manage Vault
              </Link>
            </div>
          )
        )}

        <section className="prismatic-card p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="prismatic-kicker text-primary-dim">Active Intelligence Ledger</p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white">
                Market Identity
              </h2>
            </div>
            <BarChart3 className="h-5 w-5 text-primary-dim" />
          </div>

          <div className="overflow-x-auto">
            <table className="prismatic-table min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left">Market Identity</th>
                  <th className="px-6 py-4 text-left">Volume (24h)</th>
                  <th className="px-6 py-4 text-left">Volatility</th>
                  <th className="px-6 py-4 text-left">Sentiment Index</th>
                  <th className="px-6 py-4 text-right">Vault Status</th>
                </tr>
              </thead>
              <tbody>
                {pools.slice(0, 4).map((pool) => {
                  const trend = getPoolTrend(pool);
                  const sentiment = getPoolSentiment(pool);
                  const strongestOutcome = [...pool.outcomes].sort((a, b) => b.marketShare - a.marketShare)[0];
                  return (
                    <tr key={pool.id}>
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-4">
                          <span className="mt-1 inline-flex h-10 w-1 bg-primary-container" />
                          <div>
                            <p className="font-headline text-lg font-extrabold uppercase tracking-[0.05em] text-white">
                              {pool.title}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-on-subtle">
                              {pool.status.replace("_", " ")} • {pool.totalBets.toLocaleString()} bets
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xl font-semibold text-white">{formatCurrency(pool.totalStake)}</td>
                      <td className={`px-6 py-5 text-lg font-semibold ${trend >= 0 ? "text-primary-dim" : "text-danger"}`}>
                        {formatTrend(trend)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-16 bg-surface-highest">
                            <div
                              className="h-full bg-primary-container"
                              style={{ width: `${Math.min(Math.max((strongestOutcome?.marketShare ?? 0) * 100, 5), 100)}%` }}
                            />
                          </div>
                          <span className={`prismatic-kicker text-[0.62rem] ${sentiment.className}`}>{sentiment.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/market/${pool.id}`)}
                          className="prismatic-button prismatic-button-secondary min-h-[2.45rem] px-4 text-[0.62rem]"
                        >
                          {getVaultStatus(pool)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MarketsPage;
