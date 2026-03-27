import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Radio, RefreshCw } from "lucide-react";
import {
  fetchSportsBoardEvents,
  publishSportsEvent,
  triggerSportsSync,
  unpublishSportsEvent,
  type SportCode
} from "@domains/sports/api/sportsDataApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { sportsKeys } from "@lib/query/keys";
import { getSportLabel } from "@domains/sports/utils/sportsUi";

const sportFilters: Array<{ key: "all" | SportCode; label: string }> = [
  { key: "all", label: "All" },
  { key: "f1", label: "Formula 1" },
  { key: "nrl", label: "NRL" },
  { key: "afl", label: "AFL" },
  { key: "mma", label: "MMA" },
  { key: "soccer", label: "Soccer" }
];

const SportsEventsPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sportFilter, setSportFilter] = useState<"all" | SportCode>("all");

  const eventsQuery = useQuery({
    queryKey: sportsKeys.adminBoard(sportFilter === "all" ? null : sportFilter),
    queryFn: () =>
      fetchSportsBoardEvents({
        limit: 48,
        sportCode: sportFilter === "all" ? null : sportFilter,
        includeUnpublished: true
      })
  });

  const syncMutation = useMutation({
    mutationFn: triggerSportsSync,
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Sync completed",
        description: "Provider data and generated event boards were refreshed."
      });
      queryClient.invalidateQueries({ queryKey: sportsKeys.providerHealth() });
      queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
      queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Sync failed",
        description: error.message
      });
    }
  });

  const publishMutation = useMutation({
    mutationFn: publishSportsEvent,
    onSuccess: (_, eventId) => {
      toast({
        variant: "success",
        title: "Event published",
        description: "Generated markets are now live on the public board."
      });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "admin") });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "public") });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Publish failed",
        description: error.message
      });
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: unpublishSportsEvent,
    onSuccess: (_, eventId) => {
      toast({
        variant: "success",
        title: "Event pulled from public board",
        description: "Markets were returned to admin review."
      });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "admin") });
      void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "public") });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to unpublish event",
        description: error.message
      });
    }
  });

  const events = eventsQuery.data ?? [];
  const publishedCount = events.filter((event) => event.published).length;
  const draftCount = events.length - publishedCount;
  const totalPools = events.reduce((sum, event) => sum + event.markets.length, 0);
  const totalLiquidity = events.reduce(
    (sum, event) =>
      sum + event.markets.reduce((marketSum, market) => marketSum + market.totalPool, 0),
    0
  );
  const reviewQueue = useMemo(
    () => [...events].sort((a, b) => Number(a.published) - Number(b.published)),
    [events]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="prismatic-kicker text-primary-dim">Admin Review</p>
          <h1 className="mt-3 font-headline text-4xl font-black uppercase tracking-tight text-white">
            External Event Review
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-on-subtle">
            Review auto-generated sports events, confirm the generated pools, and publish only the
            boards that should be visible to users.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]"
            onClick={() => syncMutation.mutate({ mode: "schedule", sports: ["f1", "nrl"] })}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Refresh Schedule
          </button>
          <button
            type="button"
            className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]"
            onClick={() => syncMutation.mutate({ mode: "live", sports: ["f1", "nrl"] })}
            disabled={syncMutation.isPending}
          >
            <Radio className="h-3.5 w-3.5" />
            Refresh Live Data
          </button>
          <Link
            to="/admin"
            className="prismatic-button prismatic-button-primary min-h-[2.35rem] px-4 text-[0.62rem]"
          >
            Back To Ops
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Published" value={String(publishedCount)} />
        <MetricCard label="In Review" value={String(draftCount)} />
        <MetricCard label="Generated Pools" value={String(totalPools)} />
        <MetricCard
          label="Visible Liquidity"
          value={`${currencySymbol}${totalLiquidity.toFixed(0)}`}
        />
      </section>

      <section className="flex flex-wrap gap-2">
        {sportFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setSportFilter(filter.key)}
            className="prismatic-chip"
            data-active={sportFilter === filter.key}
          >
            {filter.label}
          </button>
        ))}
      </section>

      <section className="prismatic-card p-6">
        <div className="relative z-10 overflow-x-auto">
          <table className="prismatic-table min-w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left">Event</th>
                <th className="px-6 py-4 text-left">Sport</th>
                <th className="px-6 py-4 text-left">Starts</th>
                <th className="px-6 py-4 text-left">Pools</th>
                <th className="px-6 py-4 text-left">State</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewQueue.map((event) => {
                const liquidity = event.markets.reduce((sum, market) => sum + market.totalPool, 0);
                return (
                  <tr key={event.id}>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{event.title}</p>
                        <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                          {event.sportsEvent?.competition?.name ?? event.sportsEvent?.venueName ?? "External feed"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-subtle">
                      {getSportLabel(event.sportCode)}
                    </td>
                    <td className="px-6 py-5 text-sm text-on-subtle">
                      {event.startsAt ? new Date(event.startsAt).toLocaleString() : "TBD"}
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{event.markets.length} pools</p>
                        <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                          {currencySymbol}
                          {liquidity.toFixed(0)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex border px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] ${
                          event.published
                            ? "border-primary-container/25 bg-primary-container/10 text-primary-dim"
                            : "border-white/10 bg-white/5 text-on-subtle"
                        }`}
                      >
                        {event.published ? "Live" : "Review"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/events/${event.id}`}
                          className="prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Link>
                        {event.published ? (
                          <button
                            type="button"
                            className="prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]"
                            onClick={() => unpublishMutation.mutate(event.id)}
                            disabled={unpublishMutation.isPending}
                          >
                            Pull Live
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="prismatic-button prismatic-button-primary min-h-[2.2rem] px-3 text-[0.58rem]"
                            onClick={() => publishMutation.mutate(event.id)}
                            disabled={publishMutation.isPending}
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!eventsQuery.isLoading && reviewQueue.length === 0 ? (
            <p className="px-6 py-8 text-sm text-on-subtle">
              No synced external events are available yet for this sport filter.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="border-l-2 border-primary-container bg-surface-low/85 px-5 py-5">
    <p className="text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle">{label}</p>
    <p className="mt-3 font-headline text-4xl font-black text-white">{value}</p>
  </div>
);

export default SportsEventsPage;
