import { useParams } from "react-router-dom";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useTimingStore } from "@domains/timing/store/timingStore";

const LiveTimingPage = () => {
  const { sessionId } = useParams();
  useTimingRealtime(sessionId);
  const drivers = useTimingStore((state) => state.drivers);
  const trackStatus = useTimingStore((state) => state.trackStatus);
  const phase = useTimingStore((state) => state.phase);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-white/60">
            Session
          </p>
          <h1 className="text-2xl font-semibold">{sessionId ?? "—"}</h1>
        </div>
        <div className="rounded-2xl border border-white/10 px-6 py-3">
          <p className="text-xs uppercase tracking-widest text-white/60">
            Track Status
          </p>
          <p className="text-lg font-semibold capitalize">{trackStatus}</p>
        </div>
        <div className="rounded-2xl border border-white/10 px-6 py-3">
          <p className="text-xs uppercase tracking-widest text-white/60">
            Phase
          </p>
          <p className="text-lg font-semibold capitalize">{phase}</p>
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
            {drivers.map((driver, idx) => (
              <tr
                key={driver.id}
                className="border-t border-white/5 hover:bg-white/5"
              >
                <td className="px-4 py-3">{idx + 1}</td>
                <td className="px-4 py-3 font-medium">
                  #{driver.carNumber} {driver.name}
                </td>
                <td className="px-4 py-3 text-white/70">{driver.team}</td>
                <td className="px-4 py-3 text-right">{driver.laps}</td>
                <td className="px-4 py-3 text-right">
                  {driver.lastLapMs ? formatLap(driver.lastLapMs) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {driver.bestLapMs ? formatLap(driver.bestLapMs) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {driver.gapToLeaderMs ? `+${formatLap(driver.gapToLeaderMs)}` : "Leader"}
                </td>
                <td className="px-4 py-3 text-right capitalize">
                  {driver.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

export default LiveTimingPage;
