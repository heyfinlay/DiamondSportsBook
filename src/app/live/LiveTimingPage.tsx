import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flag, Activity, Timer } from "lucide-react";
import {
  fetchDriverStandings,
  fetchPenalties,
  fetchPitEvents,
  fetchSessionDetail,
  fetchTimingResults,
  type TimingResult
} from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { buildLeaderboard, formatLapTime } from "@domains/timing/utils/leaderboard";
import { TrackStatusBanner } from "@domains/timing/components/TrackStatusBanner";

const LiveTimingPage = () => {
  const { sessionId } = useParams();
  useTimingRealtime(sessionId);

  if (!sessionId) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Provide a session ID in the URL to view live timing.
      </div>
    );
  }

  const sessionQuery = useQuery({
    queryKey: ["live-session", sessionId],
    queryFn: () => fetchSessionDetail(sessionId!),
    enabled: !!sessionId
  });

  const driversQuery = useQuery({
    queryKey: ["live-standings", sessionId],
    queryFn: () => fetchDriverStandings(sessionId!),
    enabled: !!sessionId
  });

  const penaltiesQuery = useQuery({
    queryKey: ["live-penalties", sessionId],
    queryFn: () => fetchPenalties(sessionId!),
    enabled: !!sessionId
  });

  const pitEventsQuery = useQuery({
    queryKey: ["live-pit-events", sessionId],
    queryFn: () => fetchPitEvents(sessionId!),
    enabled: !!sessionId
  });

  const resultsQuery = useQuery({
    queryKey: ["live-results", sessionId],
    queryFn: () => fetchTimingResults(sessionId!),
    enabled: !!sessionId && (sessionQuery.data?.phase === "finished" || sessionQuery.data?.status === "finished")
  });

  const isLoading = sessionQuery.isLoading || driversQuery.isLoading;
  const leaderboard = useMemo(
    () => buildLeaderboard(driversQuery.data ?? []),
    [driversQuery.data]
  );
  const totalDrivers = leaderboard.length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#070C16] to-black/60 p-6 shadow-xl shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Live timing</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              {sessionQuery.data?.name ?? (isLoading ? "Loading…" : sessionId)}
            </h1>
            <p className="text-sm text-white/70">
              {sessionQuery.data?.track_name ?? "Track TBD"}
            </p>
          </div>
          <div className="flex gap-4">
            <HeroStat
              label="Track Status"
              value={sessionQuery.data?.track_status ?? (isLoading ? "…" : "green")}
              icon={<Flag className="h-4 w-4" />}
            />
            <HeroStat
              label="Phase"
              value={sessionQuery.data?.phase ?? (isLoading ? "…" : "setup")}
              icon={<Activity className="h-4 w-4" />}
            />
            <HeroStat
              label="Drivers"
              value={isLoading ? "…" : totalDrivers.toString()}
              icon={<Timer className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      {sessionQuery.data?.phase === "finished" && (
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Final Classification</h2>
            {resultsQuery.isLoading && (
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Loading…</span>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {(resultsQuery.data ?? []).map((result) => (
              <article
                key={result.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">P{result.position}</p>
                  <p className="font-semibold text-white">
                    #{result.driver?.number ?? "—"} {result.driver?.name ?? "Driver"}
                  </p>
                  <p className="text-xs text-white/60">{result.driver?.team_name ?? "—"}</p>
                </div>
                <div className="text-right text-sm text-white">
                  <p>{formatResultGapDisplay(result)}</p>
                  <p className="text-xs text-white/60">{result.laps} laps</p>
                  <p className="text-xs text-white/60">
                    {result.total_time_ms ? formatLapTime(result.total_time_ms) : "—"}
                  </p>
                </div>
              </article>
            ))}
            {!resultsQuery.isLoading && (resultsQuery.data ?? []).length === 0 && (
              <p className="text-sm text-white/60">
                No final results saved yet. Race Control must finish the session.
              </p>
            )}
          </div>
        </section>
      )}

      <TrackStatusBanner status={sessionQuery.data?.track_status} variant="live" />

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl shadow-black/30">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 text-left">Pos</th>
              <th className="px-4 py-3 text-left">Driver</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-right">Laps</th>
              <th className="px-4 py-3 text-right">Last Lap</th>
              <th className="px-4 py-3 text-right">Best Lap</th>
              <th className="px-4 py-3 text-right">Gap</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((driver) => (
              <tr
                key={driver.driver_id}
                className="border-t border-white/5 hover:bg-white/5"
              >
                <td className="px-4 py-3">{driver.position}</td>
                <td className="px-4 py-3 font-medium">
                  #{driver.car_number} {driver.driver_name}
                </td>
                <td className="px-4 py-3 text-white/70">{driver.team_name}</td>
                <td className="px-4 py-3 text-right">{driver.laps_completed}</td>
                <td className="px-4 py-3 text-right">
                  {driver.displayLastLap}
                </td>
                <td className="px-4 py-3 text-right">
                  {driver.displayBestLap}
                </td>
                <td className="px-4 py-3 text-right">
                  {driver.displayGap}
                </td>
                <td className="px-4 py-3 text-right capitalize">
                  {driver.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <FeedCard
          title="Penalties"
          isLoading={penaltiesQuery.isLoading}
          emptyCopy="No penalties yet."
          items={
            penaltiesQuery.data?.map((penalty) => (
              <article
                key={penalty.id}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {penalty.driver?.name
                      ? `#${penalty.driver.number ?? "?"} ${penalty.driver.name}`
                      : "Session Penalty"}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatEventTime(penalty.issued_at)}
                  </p>
                </div>
                <p className="text-sm text-white/70">
                  {penalty.seconds}s · {penalty.reason}
                </p>
              </article>
            )) ?? []
          }
        />
        <FeedCard
          title="Pit Lane"
          isLoading={pitEventsQuery.isLoading}
          emptyCopy="No pit activity yet."
          items={
            pitEventsQuery.data?.map((pit) => (
              <article
                key={pit.id}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    #{pit.driver?.number ?? "?"} {pit.driver?.name ?? "Unknown Driver"}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatEventTime(pit.started_at)}
                  </p>
                </div>
                <p className="text-sm text-white/70">
                  {pit.duration_ms ? `${(pit.duration_ms / 1000).toFixed(1)}s stop` : "Duration pending"}
                </p>
              </article>
            )) ?? []
          }
        />
      </section>
    </div>
  );
};

const formatEventTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString();
};

const HeroStat = ({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-black/30 px-5 py-3">
    <div className="rounded-full border border-white/20 p-2 text-white">{icon}</div>
    <div>
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/50">{label}</p>
      <p className="text-lg font-semibold capitalize text-white">{value}</p>
    </div>
  </div>
);

const FeedCard = ({
  title,
  items,
  isLoading,
  emptyCopy
}: {
  title: string;
  items: React.ReactNode[];
  isLoading: boolean;
  emptyCopy: string;
}) => (
  <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {isLoading && (
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">Updating…</span>
      )}
    </div>
    <div className="mt-4 space-y-3">
      {items.length ? (
        items
      ) : (
        <p className="text-sm text-white/60">{emptyCopy}</p>
      )}
    </div>
  </div>
);

const formatResultGapDisplay = (result: TimingResult) => {
  if (result.position === 1) return "Leader";
  if (result.gap_laps && result.gap_laps > 0) {
    return `+${result.gap_laps}L`;
  }
  if (result.gap_ms && result.gap_ms > 0) {
    if (result.gap_ms >= 60000) {
      return `+${formatLapTime(result.gap_ms)}`;
    }
    return `+${(result.gap_ms / 1000).toFixed(3)}`;
  }
  return "+0.000";
};

export default LiveTimingPage;
