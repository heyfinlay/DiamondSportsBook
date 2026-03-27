import { Link, useNavigate, useParams } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Radio, SlidersHorizontal } from "lucide-react";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import type { Pool, PoolStatus } from "../../features/markets/types";
import { formatCurrency } from "../../features/markets/utils/format";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import type {
  FetchSportsBoardOptions,
  SportCode,
  SportsBoardEvent
} from "@domains/sports/api/sportsDataApi";
import { fetchSportsBoardEvents } from "@domains/sports/api/sportsDataApi";
import {
  getSportAccentClass,
  getSportLabel,
  getSportSurfaceClass,
  getSportWatermark
} from "@domains/sports/utils/sportsUi";
import { sportsKeys } from "@lib/query/keys";
import { useSession } from "@lib/auth/SessionProvider";
import { usePermissions } from "@lib/auth/usePermissions";
import { AuthCtaBanner } from "./components/AuthCtaBanner";

const statusOptions: Array<{ key: "all" | PoolStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closing_soon", label: "Closing Soon" },
  { key: "closed", label: "Closed" },
  { key: "settled", label: "Settled" }
];

const SUPPORTED_SPORT_CODES = new Set<SportCode>(["f1", "nrl", "afl", "mma", "soccer"]);
const SUPPORTED_POOL_STATUSES = new Set<PoolStatus>(["open", "closing_soon", "closed", "settled"]);

const normalizeSportCode = (value?: string): SportCode | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return SUPPORTED_SPORT_CODES.has(normalized as SportCode)
    ? (normalized as SportCode)
    : null;
};

const isPoolStatus = (value: string): value is PoolStatus =>
  SUPPORTED_POOL_STATUSES.has(value as PoolStatus);

const formatTimeRemainingLabel = (closeAt?: string | null, status?: string) => {
  if (!closeAt) {
    return status === "settled" ? "Settled" : "Awaiting close time";
  }

  const diffMs = new Date(closeAt).getTime() - Date.now();
  if (Number.isNaN(diffMs)) return "Awaiting close time";

  if (diffMs <= 0) {
    return status === "settled" ? "Settled" : "Closed";
  }

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `Closes in ${hours}h ${String(minutes).padStart(2, "0")}m`
    : `Closes in ${minutes}m`;
};

const flattenBoardMarkets = (events: SportsBoardEvent[]): Pool[] =>
  events.flatMap((event) =>
    event.markets
      .filter((market) => !market.archived && isPoolStatus(market.status))
      .map((market) => {
        const poolStatus = market.status as PoolStatus;
        const totalPool = Number(market.totalPool ?? 0);
        return {
          id: market.id,
          title: market.name,
          eventTitle: event.title,
          categoryLabel: getSportLabel(event.sportCode),
          sportCode: event.sportCode,
          status: poolStatus,
          totalStake: totalPool,
          totalBets: market.outcomes.reduce((sum, outcome) => sum + (outcome.pool > 0 ? 1 : 0), 0),
          closeAt: market.closeTime,
          timeRemainingLabel: formatTimeRemainingLabel(market.closeTime, poolStatus),
          rakePercent: event.takeout,
          lastUpdatedLabel: event.publishedAt
            ? new Date(event.publishedAt).toLocaleString()
            : "Awaiting publish",
          outcomes: market.outcomes.map((outcome) => {
            const stake = Number(outcome.pool ?? 0);
            const marketShare = totalPool > 0 ? stake / totalPool : 0;
            return {
              id: outcome.id,
              label: outcome.label,
              primaryLabel: outcome.label,
              secondaryLabel: outcome.participantType
                ? outcome.participantType.replace(/_/g, " ")
                : undefined,
              accentColor: outcome.color ?? undefined,
              shortLabel: outcome.label.slice(0, 3).toUpperCase(),
              participantType: outcome.participantType ?? undefined,
              marketShare,
              baselineOdds:
                stake > 0 ? Math.max((totalPool * (1 - event.takeout)) / stake, 1) : 0,
              numBets: stake > 0 ? 1 : 0,
              diamondsStaked: stake,
              trendDelta: marketShare
            };
          })
        } satisfies Pool;
      })
  );

const getPageCopy = (sportCode: SportCode | null) => {
  if (!sportCode) {
    return {
      title: "Live Markets",
      description:
        "A multi-sport command surface for published parimutuel pools, event context, and tactical liquidity flow."
    };
  }

  return {
    title: `${getSportLabel(sportCode)} Markets`,
    description:
      sportCode === "nrl"
        ? "Published Rugby League fixtures, live pool depth, and operator-approved match boards."
        : sportCode === "f1"
          ? "Published Formula 1 sessions, race boards, and automated pools sourced from the live feed."
          : `Published ${getSportLabel(sportCode)} event boards and market liquidity.`
  };
};

const MarketsPage = () => {
  const navigate = useNavigate();
  const { sportCode: sportCodeParam } = useParams();
  const selectedSportCode = normalizeSportCode(sportCodeParam);
  const { user, loading: sessionLoading } = useSession();
  const { isBettingAdmin, isSuperAdmin } = usePermissions();
  const canReviewDrafts = isBettingAdmin || isSuperAdmin;
  const setBetslipSelection = useBettingStore((state) => state.setBetslipSelection);
  const [statusFilter, setStatusFilter] = useState<"all" | PoolStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const boardQueryOptions = useMemo<FetchSportsBoardOptions>(
    () => ({
      limit: 24,
      sportCode: selectedSportCode,
      includeUnpublished: canReviewDrafts
    }),
    [canReviewDrafts, selectedSportCode]
  );

  const sportsEventsQuery = useQuery({
    queryKey: [...sportsKeys.board(selectedSportCode), canReviewDrafts ? "admin" : "public"],
    queryFn: () => fetchSportsBoardEvents(boardQueryOptions)
  });

  const boardEvents = sportsEventsQuery.data ?? [];
  const liveBoardEvents = useMemo(
    () => boardEvents.filter((event) => event.published),
    [boardEvents]
  );
  const reviewBoardEvents = useMemo(
    () => boardEvents.filter((event) => !event.published),
    [boardEvents]
  );
  const pools = useMemo(() => flattenBoardMarkets(liveBoardEvents), [liveBoardEvents]);

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

  const featuredEvent = liveBoardEvents[0] ?? (canReviewDrafts ? reviewBoardEvents[0] ?? null : null);
  const secondaryEvent = liveBoardEvents[1] ?? (canReviewDrafts ? reviewBoardEvents[1] ?? null : null);
  const featuredPools = filteredPools.slice(0, 6);
  const totalHandle = filteredPools.reduce((sum, pool) => sum + pool.totalStake, 0);
  const openPools = filteredPools.filter(
    (pool) => pool.status === "open" || pool.status === "closing_soon"
  ).length;
  const pageCopy = getPageCopy(selectedSportCode);

  const intelligenceFeed = useMemo(() => {
    if (!boardEvents.length) {
      return [
        selectedSportCode
          ? `${getSportLabel(selectedSportCode)} sync is connected, but no published event boards are live yet.`
          : "Sports sync pipeline is ready. Published boards will populate once admin review is complete.",
        "Auto-generated market templates stay in draft until an admin publishes the event.",
        "Settlement signals surface automatically after official provider results are written."
      ];
    }

    return boardEvents.slice(0, 3).map((event) => {
      const venue =
        event.sportsEvent?.venueName ??
        event.sportsEvent?.competition?.name ??
        "Live board";
      const marketCount = event.markets.filter((market) => !market.archived).length;
      return `${event.title} • ${venue} • ${marketCount} published pool${
        marketCount === 1 ? "" : "s"
      }`;
    });
  }, [boardEvents, selectedSportCode]);

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
      {canReviewDrafts && reviewBoardEvents.length ? (
        <section className="border border-primary-container/20 bg-primary-container/10 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-primary-container">
                Admin Review Queue
              </p>
              <p className="mt-1 text-sm text-white">
                {reviewBoardEvents.length} synced event
                {reviewBoardEvents.length === 1 ? "" : "s"} are in draft review and hidden from
                public betting until published.
              </p>
            </div>
            <Link
              to="/admin/sports"
              className="prismatic-button prismatic-button-secondary min-h-[2.2rem] px-4 text-[0.58rem]"
            >
              Open Review Queue
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.75fr)_22rem]">
        <div className="space-y-6">
          <header className="space-y-5">
            <div className="flex flex-wrap items-center gap-4 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle">
              <span className={`inline-flex items-center gap-2 ${getSportAccentClass(selectedSportCode)}`}>
                <Radio className="h-3.5 w-3.5" />
                Active Streams: {boardEvents.length || 0}
              </span>
              <span>Total Liquidity: {formatCurrency(totalHandle)}</span>
            </div>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="font-headline text-5xl font-black uppercase tracking-tight text-white sm:text-6xl lg:text-7xl">
                  {pageCopy.title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-on-subtle sm:text-base">
                  {pageCopy.description}
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={`Search ${selectedSportCode ? getSportLabel(selectedSportCode) : "live"} events and pools`}
                className="min-h-[3rem] flex-1 border border-outline-variant/15 bg-surface-lowest px-4 text-sm text-white outline-none transition placeholder:text-on-subtle focus:border-primary-container/35"
              />
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
            <section
              className={`prismatic-card min-h-[24rem] bg-gradient-to-br ${getSportSurfaceClass(
                featuredEvent?.sportCode ?? selectedSportCode
              )} p-6 sm:p-8`}
            >
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-primary-container">
                        {featuredEvent?.published === false ? "In Review" : "Featured"}
                      </span>
                      <span className={getSportAccentClass(featuredEvent?.sportCode ?? selectedSportCode)}>
                        {getSportLabel(featuredEvent?.sportCode ?? selectedSportCode)}
                      </span>
                    </div>
                    <h2 className="mt-4 max-w-3xl font-headline text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                      {featuredEvent?.title ?? "Awaiting Published Events"}
                    </h2>
                    <p className="mt-3 text-sm uppercase tracking-[0.14em] text-on-subtle">
                      {featuredEvent?.sportsEvent?.venueName ??
                        featuredEvent?.sportsEvent?.competition?.name ??
                        "Sync + admin publish are required before markets are visible here"}
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
                      {getSportWatermark(featuredEvent?.sportCode ?? selectedSportCode)}
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
                            {featuredEvent.published ? "Enter Event" : "Preview Event"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-outline-variant/15 bg-surface-lowest/80 p-6 text-sm text-on-subtle">
                      Auto-generated markets remain in admin review until the event is published.
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
                    {secondaryEvent?.title ?? "Awaiting next board"}
                  </h3>
                  <p className="mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                    {secondaryEvent
                      ? `${getSportLabel(secondaryEvent.sportCode)} • ${secondaryEvent.markets.length} pools`
                      : "Operator-published events will appear here"}
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
                    <p className="font-headline text-2xl font-black text-primary-container">
                      {openPools}
                    </p>
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
                <MetricCard label="Published Events" value={String(boardEvents.length)} />
                <MetricCard label="Open Pools" value={String(openPools)} />
                <MetricCard label="Total Liquidity" value={formatCurrency(totalHandle)} />
              </div>
            </div>
          </section>

          <section className="prismatic-card p-6">
            <div className="relative z-10">
              <p className="prismatic-kicker text-white">Tactical Feed</p>
              <div className="mt-5 space-y-3">
                {intelligenceFeed.map((item, index) => (
                  <div
                    key={item}
                    className="border-l-2 border-primary-container/40 bg-surface-lowest/80 px-4 py-3"
                  >
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
            Active Published Pools
          </h2>
        </div>
        {selectedSportCode ? (
          <Link
            to="/"
            className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]"
          >
            All Sports
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]"
          >
            Live Board
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </section>

      {sportsEventsQuery.isLoading ? (
        <div className="prismatic-card p-6 text-on-subtle">Loading published sports board…</div>
      ) : featuredPools.length ? (
        <MarketPoolsGrid
          pools={featuredPools}
          onSelectPool={(poolId) => navigate(`/market/${poolId}`)}
          onSelectOutcome={handleOutcomeSelect}
        />
      ) : (
        <div className="prismatic-card p-6 text-on-subtle">
          No published pools match the current view yet. Sync the provider and publish the event from
          admin review first.
        </div>
      )}
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
