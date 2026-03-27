import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Radio, Timer } from "lucide-react";
import { fetchSportsEventDetail } from "@domains/sports/api/sportsDataApi";
import { getSportAccentClass, getSportLabel, getSportSurfaceClass, getSportWatermark } from "@domains/sports/utils/sportsUi";
import { sportsKeys } from "@lib/query/keys";
import { usePermissions } from "@lib/auth/usePermissions";
import { formatCurrency } from "../../features/markets/utils/format";

const formatLiveMetricValue = (value: unknown) => {
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "—";
};

const EventDetailPage = () => {
  const { eventId } = useParams();
  const { isBettingAdmin, isSuperAdmin } = usePermissions();
  const includeUnpublished = isBettingAdmin || isSuperAdmin;
  const eventQuery = useQuery({
    queryKey: sportsKeys.event(eventId, includeUnpublished ? "admin" : "public"),
    queryFn: () => fetchSportsEventDetail(eventId!, { includeUnpublished }),
    enabled: !!eventId
  });

  const event = eventQuery.data;
  const liveMetrics = useMemo(() => {
    const liveState = event?.sportsEvent?.liveState ?? {};
    const entries = Object.entries(liveState).slice(0, 4);
    if (entries.length) {
      return entries.map(([key, value]) => ({
        label: key.replace(/_/g, " "),
        value: formatLiveMetricValue(value)
      }));
    }

    return [
      {
        label: "Event Status",
        value: event?.sportsEvent?.status ?? event?.status ?? "Standby"
      },
      {
        label: "Venue",
        value: event?.sportsEvent?.venueName ?? "Awaiting feed"
      },
      {
        label: "Round",
        value: event?.sportsEvent?.roundLabel ?? "TBD"
      },
      {
        label: "Clock",
        value: event?.sportsEvent?.liveClock ?? "—"
      }
    ];
  }, [event]);

  const participants = useMemo(() => {
    return [...(event?.sportsEvent?.participants ?? [])].sort((a, b) => {
      const aRank = a.liveRank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.liveRank ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }, [event?.sportsEvent?.participants]);

  const activePools = event?.markets.filter((market) => !market.archived) ?? [];

  if (!eventId) {
    return <div className="prismatic-card p-6 text-on-subtle">Event not found.</div>;
  }

  if (eventQuery.isLoading) {
    return <div className="prismatic-card p-6 text-on-subtle">Loading event intelligence…</div>;
  }

  if (!event) {
    return <div className="prismatic-card p-6 text-on-subtle">No external event is linked to this board yet.</div>;
  }

  return (
    <div className="space-y-10">
      <section className={`prismatic-card bg-gradient-to-br ${getSportSurfaceClass(event.sportCode)} p-6 sm:p-8`}>
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-primary-container">
                  {event.published ? "Live Now" : "Admin Preview"}
                </span>
                <span className={`text-[0.68rem] uppercase tracking-[0.18em] ${getSportAccentClass(event.sportCode)}`}>
                  {getSportLabel(event.sportCode)}
                </span>
                <span className="text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle">
                  {event.sportsEvent?.roundLabel ?? event.sportsEvent?.competition?.name ?? "Live board"}
                </span>
              </div>
              <h1 className="mt-4 max-w-4xl font-headline text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
                {event.title}
              </h1>
              <p className="mt-4 text-sm leading-7 text-on-subtle">
                {event.description ?? "Sports context, participant order, and pool access are unified into a single event hub."}
              </p>
              {!event.published && includeUnpublished ? (
                <p className="mt-4 border border-primary-container/20 bg-primary-container/10 px-4 py-3 text-[0.68rem] uppercase tracking-[0.16em] text-primary-container">
                  This event is still in operator review and is not visible on the public board.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {liveMetrics.map((metric) => (
                <div key={metric.label} className="border border-outline-variant/15 bg-surface-lowest/80 px-4 py-4">
                  <p className="text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle">{metric.label}</p>
                  <p className="mt-2 font-headline text-2xl font-black text-white">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="relative overflow-hidden border border-outline-variant/15 bg-surface-lowest/70 p-6">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]">
                <span className="font-headline text-[7rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[10rem]">
                  {getSportWatermark(event.sportCode)}
                </span>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="prismatic-kicker text-white">Participant Order</p>
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-on-subtle">
                    {participants.length} tracked
                  </p>
                </div>
                <div className="mt-6 space-y-3">
                  {participants.slice(0, 5).map((participant, index) => (
                    <div key={participant.id} className="grid grid-cols-[3rem_minmax(0,1fr)_5rem] items-center gap-4 bg-surface-low px-4 py-4">
                      <div className="font-headline text-2xl font-black text-white">
                        {String(participant.liveRank ?? index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-headline text-lg font-bold uppercase tracking-[0.03em] text-white">
                          {participant.displayName}
                        </p>
                        <p className="mt-1 text-[0.64rem] uppercase tracking-[0.16em] text-on-subtle">
                          {participant.side ?? participant.participantType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-headline text-xl font-black text-primary-fixed">
                          {participant.score != null ? participant.score : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="prismatic-card p-6">
                <div className="relative z-10">
                  <p className="prismatic-kicker text-primary-dim">Available Pools</p>
                  <div className="mt-6 space-y-4">
                    {activePools.length ? (
                      activePools.map((market) => (
                        <Link
                          key={market.id}
                          to={`/market/${market.id}`}
                          className="block border border-outline-variant/15 bg-surface-lowest/80 p-4 transition hover:border-primary-container/25"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-headline text-xl font-bold uppercase tracking-[0.04em] text-white">
                                {market.name}
                              </p>
                              <p className="mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                                {market.status} • {market.outcomes.length} outcomes
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-primary-container" />
                          </div>
                          <div className="mt-4 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em]">
                            <span className="text-on-subtle">Liquidity</span>
                            <span className="font-semibold text-white">{formatCurrency(market.totalPool)}</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="border border-outline-variant/15 bg-surface-lowest/80 p-4 text-sm text-on-subtle">
                        No active pools are linked to this event yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="prismatic-card p-6">
                <div className="relative z-10">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary-container" />
                    <p className="prismatic-kicker text-white">Tactical Updates</p>
                  </div>
                  <div className="mt-5 space-y-3">
                    {(event.sportsEvent?.results.slice(0, 3) ?? []).map((result) => (
                      <div key={`${result.participantId}-${result.resultStatus}`} className="border-l-2 border-primary-container/40 bg-surface-lowest/80 px-4 py-3">
                        <p className="text-[0.58rem] uppercase tracking-[0.18em] text-primary-container">
                          {result.resultStatus}
                        </p>
                        <p className="mt-2 text-sm text-on-surface">
                          {result.participantName}
                          {result.outcomeText ? ` • ${result.outcomeText}` : ""}
                          {result.scoreText ? ` • ${result.scoreText}` : ""}
                        </p>
                      </div>
                    ))}
                    {!event.sportsEvent?.results.length ? (
                      <div className="border-l-2 border-outline-variant/20 bg-surface-lowest/80 px-4 py-3 text-sm text-on-subtle">
                        Official result updates will appear here once the provider marks the event final.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="prismatic-card p-6">
          <div className="relative z-10">
            <p className="prismatic-kicker text-primary-dim">Feed State</p>
            <div className="mt-6 space-y-3">
              <StateRow label="Source Type" value={event.sourceType ?? "external_feed"} />
              <StateRow label="External Status" value={event.externalStatus ?? event.sportsEvent?.status ?? "standby"} />
              <StateRow label="Competition" value={event.sportsEvent?.competition?.name ?? "Unmapped"} />
              <StateRow label="Publication" value={event.published ? "Live" : "Draft Review"} />
            </div>
          </div>
        </div>
        <div className="prismatic-card p-6">
          <div className="relative z-10">
            <p className="prismatic-kicker text-primary-dim">Market Automation</p>
            <div className="mt-6 space-y-3">
              <StateRow label="Auto-Managed Pools" value={String(activePools.filter((market) => market.autoManaged).length)} />
              <StateRow label="Total Pools" value={String(activePools.length)} />
              <StateRow label="Featured Pool" value={activePools[0]?.name ?? "Pending"} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const StateRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3 text-sm">
    <span className="text-on-subtle">{label}</span>
    <span className="font-semibold text-white">{value}</span>
  </div>
);

export default EventDetailPage;
