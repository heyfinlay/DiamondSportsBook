import { Link, useNavigate } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Radio, SlidersHorizontal } from "lucide-react";
import { fetchUiPools } from "../../features/markets/api";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import type { Pool, PoolStatus } from "../../features/markets/types";
import { formatCurrency } from "../../features/markets/utils/format";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import { fetchSportsBoardEvents } from "@domains/sports/api/sportsDataApi";
import { getSportAccentClass, getSportLabel, getSportSurfaceClass, getSportWatermark } from "@domains/sports/utils/sportsUi";
import { marketKeys, sportsKeys } from "@lib/query/keys";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";

const statusOptions: Array<{ key: "all" | PoolStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closing_soon", label: "Closing Soon" },
  { key: "closed", label: "Closed" },
  { key: "settled", label: "Settled" }
];

const MarketsPage = () => {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const setBetslipSelection = useBettingStore((state) => state.setBetslipSelection);
  const [statusFilter, setStatusFilter] = useState<"all" | PoolStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const poolsQuery = useQuery({
    queryKey: marketKeys.pools(),
    queryFn: fetchUiPools
  });

  const sportsEventsQuery = useQuery({
    queryKey: sportsKeys.board(),
    queryFn: () => fetchSportsBoardEvents(18)
  });

  const pools = poolsQuery.data ?? [];
  const boardEvents = sportsEventsQuery.data ?? [];

  const filteredPools = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    const byStatus =
      statusFilter === "all" ? pools : pools.filter((pool) => pool.status === statusFilter);

    if (!query) return byStatus;

    return byStatus.filter((pool) => {
      const haystack = `${pool.title} ${pool.eventTitle ?? ""} ${pool.categoryLabel ?? ""}`
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearchQuery, pools, statusFilter]);

  const featuredEvent = boardEvents[0] ?? null;
  const secondaryEvent = boardEvents[1] ?? null;
  const featuredPools = filteredPools.slice(0, 6);
  const totalHandle = filteredPools.reduce((sum, pool) => sum + pool.totalStake, 0);
  const openPools = filteredPools.filter((pool) => pool.status === "open" || pool.status === "closing_soon").length;
  const intelligenceFeed = useMemo(() => {
    if (!boardEvents.length) {
      return [
        "Sports sync pipeline ready. Connect provider jobs to populate tactical updates.",
        "Pool automation will appear here once external feed events are linked to market templates.",
        "Settlement signals will surface after official result states arrive from the provider."
      ];
    }

    return boardEvents.slice(0, 3).map((event) => {
      const venue = event.sportsEvent?.venueName ?? event.sportsEvent?.competition?.name ?? "Live board";
      const marketCount = event.markets.filter((market) => !market.archived).length;
      return `${event.title} • ${venue} • ${marketCount} active pool${marketCount === 1 ? "" : "s"}`;
    });
  }, [boardEvents]);

  const handleOutcomeSelect = (
    poolId: string,
    poolTitle: string,
    outcome: Pool["outcomes"][number]
  ) => {
    setBetslipSelection({
      marketId: poolId,
      marketName: poolTitle,
      eventTitle: null,
      outcomeId: outcome.id,
      outcomeLabel: outcome.secondaryLabel
        ? `${outcome.primaryLabel} — ${outcome.secondaryLabel}`
        : outcome.primaryLabel,
      minStake: 0,
      maxStake: 0,
      stake: 0
    });
    navigate(`/market/${poolId}`);
  };

  return (
    <div className="space-y-10">
      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.75fr)_22rem]">
        <div className="space-y-6">
          <header className="space-y-5">
            <div className="flex flex-wrap items-center gap-4 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle">
              <span className="inline-flex items-center gap-2 text-primary-container">
                <Radio className="h-3.5 w-3.5" />
                Active Streams: {boardEvents.length || 0}
              </span>
              <span>Total Liquidity: {formatCurrency(totalHandle)}</span>
            </div>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="font-headline text-5xl font-black uppercase tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Live Markets
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-on-subtle sm:text-base">
                  A multi-sport command surface for live parimutuel pools, event context, and tactical liquidity flow.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setStatusFilter(option.key)}
                    className="prismatic-chip"
                    data-active={statusFilter === option.key}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
            <section
              className={`prismatic-card min-h-[24rem] bg-gradient-to-br ${getSportSurfaceClass(featuredEvent?.sportCode)} p-6 sm:p-8`}
            >
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-primary-container">
                        Featured
                      </span>
                      <span className={getSportAccentClass(featuredEvent?.sportCode)}>
                        {getSportLabel(featuredEvent?.sportCode)}
                      </span>
                    </div>
                    <h2 className="mt-4 max-w-3xl font-headline text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                      {featuredEvent?.title ?? "Sports Feed Ready"}
                    </h2>
                    <p className="mt-3 text-sm uppercase tracking-[0.14em] text-on-subtle">
                      {featuredEvent?.sportsEvent?.venueName ??
                        featuredEvent?.sportsEvent?.competition?.name ??
                        "Connect a live provider to populate the event board"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="prismatic-kicker text-primary-dim">Closes In</p>
                    <p className="mt-2 font-headline text-3xl font-black text-white">
                      {featuredEvent?.markets[0]?.closeTime
                        ? new Date(featuredEvent.markets[0].closeTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "Standby"}
                    </p>
                  </div>
                </div>

                <div className="relative mt-10">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]">
                    <span className="font-headline text-[7rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[10rem]">
                      {getSportWatermark(featuredEvent?.sportCode)}
                    </span>
                  </div>

                  {featuredEvent?.markets[0] ? (
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="prismatic-kicker text-white">Live Pool Weights</p>
                        <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                          {featuredEvent.markets[0].outcomes.length} outcomes
                        </p>
                      </div>
                      <div className="flex h-16 items-end gap-1">
                        {featuredEvent.markets[0].outcomes.slice(0, 4).map((outcome) => {
                          const share =
                            featuredEvent.markets[0].totalPool > 0
                              ? (outcome.pool / featuredEvent.markets[0].totalPool) * 100
                              : 0;
                          const height = `${Math.max(share, 12)}%`;
                          return (
                            <div key={outcome.id} className="flex flex-1 flex-col justify-end gap-2">
                              <div
                                className="w-full"
                                style={{
                                  height,
                                  backgroundColor: outcome.color ?? "#00f0ff"
                                }}
                              />
                              <p className="truncate text-[0.58rem] font-bold uppercase tracking-[0.14em] text-on-subtle">
                                {outcome.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid gap-4 pt-4 sm:grid-cols-3">
                        <div>
                          <p className="prismatic-kicker">Pool Liquidity</p>
                          <p className="mt-2 font-headline text-2xl font-black text-white">
                            {formatCurrency(featuredEvent.markets[0].totalPool)}
                          </p>
                        </div>
                        <div>
                          <p className="prismatic-kicker">Status</p>
                          <p className="mt-2 font-headline text-2xl font-black text-primary-fixed">
                            {featuredEvent.markets[0].status.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex items-end justify-start sm:justify-end">
                          <Link
                            to={`/events/${featuredEvent.id}`}
                            className="prismatic-button prismatic-button-primary w-full px-6 text-[0.64rem] sm:w-auto"
                          >
                            Enter Event
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-outline-variant/15 bg-surface-lowest/80 p-6 text-sm text-on-subtle">
                      Market templates will appear here after the first sports event is synced and generated.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="prismatic-card p-6">
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary-container" />
                    <p className="prismatic-kicker text-white">Trending Event</p>
                  </div>
                  <h3 className="mt-5 font-headline text-2xl font-bold uppercase tracking-tight text-white">
                    {secondaryEvent?.title ?? "Awaiting schedule sync"}
                  </h3>
                  <p className="mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                    {secondaryEvent
                      ? `${getSportLabel(secondaryEvent.sportCode)} • ${secondaryEvent.markets.length} pools`
                      : "Secondary event intelligence will appear here"}
                  </p>

                  <div className="mt-8 space-y-4">
                    {(secondaryEvent?.markets.slice(0, 2) ?? []).map((market) => (
                      <Link
                        key={market.id}
                        to={`/market/${market.id}`}
                        className="block border border-outline-variant/15 bg-surface-lowest/80 p-4 transition hover:border-primary-container/25"
                      >
                        <p className="text-sm font-semibold text-white">{market.name}</p>
                        <div className="mt-3 flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                          <span>{formatCurrency(market.totalPool)}</span>
                          <span>{market.status}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-outline-variant/15 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="prismatic-kicker">Open Pools</p>
                    <p className="font-headline text-2xl font-black text-primary-container">{openPools}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                    <span>Filter by liquidity</span>
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {!sessionLoading && !user ? <AuthCtaBanner /> : null}
        </div>

        <aside className="space-y-6">
          <section className="prismatic-card p-6">
            <div className="relative z-10">
              <p className="prismatic-kicker text-primary-dim">Command Metrics</p>
              <div className="mt-6 grid gap-4">
                <MetricCard label="Live Pools" value={String(pools.length)} />
                <MetricCard label="Open Now" value={String(openPools)} />
                <MetricCard label="Total Liquidity" value={formatCurrency(totalHandle)} />
              </div>
            </div>
          </section>

          <section className="prismatic-card p-6">
            <div className="relative z-10">
              <p className="prismatic-kicker text-white">Tactical Feed</p>
              <div className="mt-5 space-y-3">
                {intelligenceFeed.map((item, index) => (
                  <div key={item} className="border-l-2 border-primary-container/40 bg-surface-lowest/80 px-4 py-3">
                    <p className="text-[0.58rem] uppercase tracking-[0.18em] text-primary-container">
                      {index === 0 ? "pool_update" : index === 1 ? "event_info" : "system_msg"}
                    </p>
                    <p className="mt-2 text-sm text-on-surface">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="flex items-center justify-between">
        <div>
          <p className="prismatic-kicker text-primary-dim">Prime Markets</p>
          <h2 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight text-white">
            Active High-Stakes Pools
          </h2>
        </div>
        <button type="button" className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]">
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </section>

      <MarketPoolsGrid
        pools={featuredPools}
        onSelectPool={(poolId) => navigate(`/market/${poolId}`)}
        onSelectOutcome={handleOutcomeSelect}
      />
    </div>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="border-l-2 border-primary-container bg-surface-lowest/85 px-4 py-4">
    <p className="text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle">{label}</p>
    <p className="mt-3 font-headline text-3xl font-black text-white">{value}</p>
  </div>
);

export default MarketsPage;
