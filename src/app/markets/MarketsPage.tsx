import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchMarketEvents, type EventWithMarkets } from "@domains/betting/api/bettingApi";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import { useToast } from "@app/components/ToastProvider";
import { previewWager } from "@domains/betting/api/bettingApi";
import { buildOutcomeIdentity } from "@domains/betting/utils/outcomeDisplay";

const DEFAULT_STAKE = 100;

const formatStatus = (status: string) => {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
};

const formatClosesAt = (closeTime?: string | null) => {
  if (!closeTime) return "No scheduled close";
  const closeDate = new Date(closeTime);
  if (Number.isNaN(closeDate.getTime())) return "No scheduled close";
  const diffMs = closeDate.getTime() - Date.now();
  if (diffMs <= 0) return "Closed";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `Closes in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `Closes in ${hours}h`;
};

const MarketsPage = () => {
  const { toast } = useToast();
  const openBetslip = useBettingStore((state) => state.openBetslip);
  const setPreviewData = useBettingStore((state) => state.setPreviewData);

  const eventsQuery = useQuery({
    queryKey: ["markets", "events"],
    queryFn: fetchMarketEvents
  });

  const previewMutation = useMutation({
    mutationFn: ({
      marketId,
      outcomeId,
      stake
    }: {
      marketId: string;
      outcomeId: string;
      stake: number;
    }) => previewWager(marketId, outcomeId, stake),
    onSuccess: (result) => setPreviewData(result),
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to preview wager",
        description: error.message
      });
    }
  });

  const handleOutcomeSelect = (
    event: EventWithMarkets,
    market: EventWithMarkets["markets"][number],
    outcome: EventWithMarkets["markets"][number]["outcomes"][number]
  ) => {
    const initialStake = market.min_stake
      ? Math.max(market.min_stake, DEFAULT_STAKE)
      : DEFAULT_STAKE;
    const teamColor = outcome.teamColor ?? outcome.color ?? null;
    openBetslip({
      marketId: market.id,
      marketName: market.name,
      eventTitle: event.title,
      outcomeId: outcome.id,
      outcomeLabel: outcome.label,
      teamName: outcome.teamName ?? null,
      driverName: outcome.driverName ?? null,
      teamColor,
      minStake: market.min_stake,
      maxStake: market.max_stake,
      stake: initialStake
    });
    setPreviewData(null);
    previewMutation.mutate({
      marketId: market.id,
      outcomeId: outcome.id,
      stake: initialStake
    });
  };

  // Filter to only show events with at least one active market
  const eventsWithActiveMarkets = eventsQuery.data?.filter(
    (event) => event.markets.length > 0
  ) ?? [];

  const hasEvents = eventsWithActiveMarkets.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-[#060910]/80 p-8 shadow-[0_0_40px_rgba(15,23,42,0.45)]">
        <span className="text-xs uppercase tracking-[0.35em] text-[#9FF7D3]">
          Diamond Sports Book
        </span>
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">
          Live Markets
        </h1>
        <p className="max-w-2xl text-sm text-neutral-300 sm:text-base">
          All DBGP betting uses a live parimutuel system. Your payout depends on the total Diamonds staked across each outcome.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9FF7D3]">
            How It Works
          </p>
          <p className="mt-2 text-sm text-neutral-300">
            Markets update in real time as Diamonds move across the pool. Odds and payout estimates will rise or fall until the market closes and locks your final price.
          </p>
        </div>
        <p className="text-[0.7rem] uppercase tracking-[0.3em] text-neutral-500">
          All wagers settled in Diamonds (in-game currency). Parody product; no real-world stakes.
        </p>
      </header>

      {eventsQuery.isLoading && (
        <p className="text-sm text-neutral-400">Loading live markets…</p>
      )}

      {eventsQuery.isError && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Unable to load markets right now. Refresh to try again.
        </p>
      )}

      {hasEvents ? (
        <section className="flex flex-col gap-6">
          {eventsWithActiveMarkets.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-[#05070F]/80 p-6"
            >
              <header className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-[0.35em] text-[#7C6BFF]">
                  Event
                </span>
                <h2 className="text-2xl font-semibold text-white">{event.title}</h2>
                <p className="text-sm text-neutral-400">
                  {event.session?.track_name ? `${event.session.track_name} • ` : ""}
                  {event.starts_at ? new Date(event.starts_at).toLocaleString() : "Schedule TBC"}
                </p>
              </header>

              <div className="grid gap-4 md:grid-cols-2">
                {event.markets.map((market) => (
                  <article
                    key={market.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#060910]/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[1.125rem] font-semibold leading-tight text-white md:text-[1.35rem]">
                        {market.name}
                      </h3>
                      <span className="shrink-0 text-xs uppercase tracking-[0.35em] text-neutral-500">
                        {formatStatus(market.status)}
                      </span>
                    </div>
                    <div>
                      {market.description && (
                        <p className="text-sm text-neutral-400">{market.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400">
                      {formatClosesAt(market.close_time)} • Pool Ɖ
                      {market.total_pool.toLocaleString()}
                    </p>
                    <ul className="flex flex-wrap gap-2 text-xs text-neutral-300">
                      {market.outcomes.slice(0, 4).map((outcome) => {
                        const identity = buildOutcomeIdentity({
                          teamName: outcome.teamName ?? null,
                          driverName: outcome.driverName,
                          fallbackLabel: outcome.label,
                          teamColor: outcome.teamColor ?? outcome.color ?? null
                        });
                        return (
                          <li key={outcome.id} className="min-w-[10rem]">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-left transition hover:border-brand hover:text-white"
                              onClick={() => handleOutcomeSelect(event, market, outcome)}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: identity.color }}
                              />
                              <span className="flex flex-col text-xs">
                                <span className="font-semibold text-white">
                                  {identity.primaryLabel}
                                </span>
                                {identity.secondaryLabel && (
                                  <span className="text-[11px] text-neutral-400">
                                    {identity.secondaryLabel}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {market.outcomes.length > 4 && (
                        <li className="rounded-full border border-white/10 px-3 py-1 text-neutral-500">
                          +{market.outcomes.length - 4} more
                        </li>
                      )}
                    </ul>
                    <Link
                      to={`/market/${market.id}`}
                      className="text-xs font-semibold uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:text-white"
                    >
                      View details →
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        !eventsQuery.isLoading && (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-[#05070F]/40 p-8 text-sm text-neutral-400">
            <div className="flex-1">
              <p className="font-semibold text-white">Live market board coming online</p>
              <p>Admin tools will seed the first tote shortly. Check back once the next event opens betting.</p>
            </div>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-full border border-[#9FF7D3]/40 px-4 py-2 uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:border-[#9FF7D3]/70 hover:text-white"
            >
              Manage wallet
            </Link>
          </div>
        )
      )}
    </div>
  );
};

export default MarketsPage;
