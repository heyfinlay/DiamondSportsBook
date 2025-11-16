import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDriverStandings,
  fetchPenalties,
  fetchPitEvents,
  fetchSessionDetail
} from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";

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

  const isLoading = sessionQuery.isLoading || driversQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-white/60">
            Session
          </p>
          <h1 className="text-2xl font-semibold">
            {sessionQuery.data?.name ?? (isLoading ? "Loading…" : sessionId)}
          </h1>
          <p className="text-sm text-white/60">
            {sessionQuery.data?.track_name ?? "Track TBD"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 px-6 py-3 text-right">
          <p className="text-xs uppercase tracking-widest text-white/60">
            Track Status
          </p>
          <p className="text-lg font-semibold capitalize">
            {sessionQuery.data?.track_status ?? (isLoading ? "…" : "green")}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 px-6 py-3 text-right">
          <p className="text-xs uppercase tracking-widest text-white/60">
            Phase
          </p>
          <p className="text-lg font-semibold capitalize">
            {sessionQuery.data?.phase ?? (isLoading ? "…" : "setup")}
          </p>
        </div>
      </div>

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
            {driversQuery.data?.map((driver, idx) => (
              <tr
                key={driver.driver_id}
                className="border-t border-white/5 hover:bg-white/5"
              >
                <td className="px-4 py-3">{driver.position ?? idx + 1}</td>
                <td className="px-4 py-3 font-medium">
                  #{driver.car_number} {driver.driver_name}
                </td>
                <td className="px-4 py-3 text-white/70">{driver.team_name}</td>
                <td className="px-4 py-3 text-right">{driver.laps_completed}</td>
                <td className="px-4 py-3 text-right">
                  {driver.last_lap_ms ? formatLap(driver.last_lap_ms) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {driver.best_lap_ms ? formatLap(driver.best_lap_ms) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {driver.gap_to_leader_ms
                    ? `+${formatLap(driver.gap_to_leader_ms)}`
                    : "Leader"}
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
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Penalties</h2>
            {penaltiesQuery.isLoading && (
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Updating…
              </span>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {penaltiesQuery.data?.map((penalty) => (
              <article
                key={penalty.id}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {penalty.driver?.display_name
                      ? `#${penalty.driver.car_number ?? "?"} ${penalty.driver.display_name}`
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
            ))}
            {penaltiesQuery.data && penaltiesQuery.data.length === 0 && (
              <p className="text-sm text-white/60">No penalties yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pit Events</h2>
            {pitEventsQuery.isLoading && (
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Updating…
              </span>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {pitEventsQuery.data?.map((pit) => (
              <article
                key={pit.id}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    #{pit.driver?.car_number ?? "?"}{" "}
                    {pit.driver?.display_name ?? "Unknown Driver"}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatEventTime(pit.started_at)}
                  </p>
                </div>
                <p className="text-sm text-white/70">
                  {pit.duration_ms ? formatDuration(pit.duration_ms) : "Duration pending"}
                </p>
              </article>
            ))}
            {pitEventsQuery.data && pitEventsQuery.data.length === 0 && (
              <p className="text-sm text-white/60">No pit activity yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const formatLap = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
    .toString()
    .padStart(3, "0")}`;
};

const formatEventTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString();
};

const formatDuration = (ms: number) => {
  return `${(ms / 1000).toFixed(1)}s`;
};

export default LiveTimingPage;
