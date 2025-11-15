import { useParams } from "react-router-dom";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useTimingStore } from "@domains/timing/store/timingStore";

const phases = ["setup", "warmup", "grid", "race", "finished"];

const RaceControlPage = () => {
  const { sessionId } = useParams();
  useTimingRealtime(sessionId);
  const phase = useTimingStore((state) => state.phase);
  const drivers = useTimingStore((state) => state.drivers);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        {phases.map((name) => (
          <button
            key={name}
            className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
              phase === name
                ? "bg-brand text-black"
                : "bg-white/10 text-white/70 hover:text-white"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Drivers</h2>
              <p className="text-sm text-white/60">
                Hotkeys + quick lap logging coming soon.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 px-4 py-2">
              Session: {sessionId ?? "—"}
            </div>
          </header>
          <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
            <div className="grid grid-cols-6 gap-3 text-xs uppercase tracking-wider text-white/60">
              <span>Driver</span>
              <span>Lap</span>
              <span>Last</span>
              <span>Best</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <div className="mt-3 space-y-2">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="grid grid-cols-6 items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-sm"
                >
                  <div className="font-semibold">
                    #{driver.carNumber} {driver.name}
                  </div>
                  <div>{driver.laps}</div>
                  <div>{driver.lastLapMs ? formatLap(driver.lastLapMs) : "—"}</div>
                  <div>{driver.bestLapMs ? formatLap(driver.bestLapMs) : "—"}</div>
                  <div className="capitalize">{driver.status}</div>
                  <div>
                    <button className="rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand">
                      Log Lap
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-xl font-semibold">Event Feed</h2>
          <p className="text-sm text-white/60">
            Real-time lap, flag, and incident updates will appear here.
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Feed placeholder — connect to `race_events` after backend scaffolding.
          </div>
        </aside>
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

export default RaceControlPage;
