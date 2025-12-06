import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { DriverStanding } from "@domains/timing/api/timingApi";
import { formatLapTime } from "@domains/timing/utils/leaderboard";

const DRIVER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "ready", label: "Ready" },
  { value: "finished", label: "Finished" },
  { value: "retired", label: "Retired" },
  { value: "dnf", label: "DNF" },
  { value: "dns", label: "DNS" }
];

const sortEntries = (entries: DriverStanding[]) => {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    const aDisplay = a.display_position ?? Number.MAX_SAFE_INTEGER;
    const bDisplay = b.display_position ?? Number.MAX_SAFE_INTEGER;
    if (aDisplay !== bDisplay) return aDisplay - bDisplay;

    const aPos = a.position ?? Number.MAX_SAFE_INTEGER;
    const bPos = b.position ?? Number.MAX_SAFE_INTEGER;
    if (aPos !== bPos) return aPos - bPos;

    return a.car_number - b.car_number;
  });
  return sorted;
};

const parseLapInput = (value: string): number | null | undefined => {
  const raw = value.trim();
  if (!raw) return null;

  let minutes = 0;
  let secondsPortion = raw;

  if (raw.includes(":")) {
    const [minPart, secPart] = raw.split(":");
    minutes = Number(minPart);
    secondsPortion = secPart ?? "";
    if (!Number.isFinite(minutes)) return undefined;
  }

  const seconds = Number(secondsPortion);
  if (!Number.isFinite(seconds)) return undefined;

  const totalSeconds = minutes * 60 + seconds;
  const ms = Math.round(totalSeconds * 1000);
  if (ms <= 0) return undefined;
  return ms;
};

const formatInputValue = (ms?: number | null) => (ms && ms > 0 ? formatLapTime(ms, "") : "");

type RaceOrderPanelProps = {
  entries: DriverStanding[];
  onReorder: (updates: Array<{ driverId: string; displayPosition: number | null }>) => Promise<void> | void;
  onUpdateBestLap: (driverId: string, bestLapMs: number | null) => Promise<void> | void;
  onUpdateStatus: (driverId: string, status: string) => Promise<void> | void;
  disabled?: boolean;
  savingOrder?: boolean;
  savingLap?: boolean;
  statusUpdating?: boolean;
  notify: (options: { title: string; description?: string; variant?: "success" | "error" | "default" }) => void;
};

const RaceOrderPanel = ({
  entries,
  onReorder,
  onUpdateBestLap,
  onUpdateStatus,
  disabled,
  savingOrder,
  savingLap,
  statusUpdating,
  notify
}: RaceOrderPanelProps) => {
  const [orderedEntries, setOrderedEntries] = useState<DriverStanding[]>([]);
  const [lapInputs, setLapInputs] = useState<Record<string, string>>({});
  const [localOrdering, setLocalOrdering] = useState(false);

  useEffect(() => {
    const sorted = sortEntries(entries);
    setOrderedEntries(sorted);
    const nextInputs: Record<string, string> = {};
    sorted.forEach((entry) => {
      nextInputs[entry.driver_id] = formatInputValue(entry.best_lap_ms);
    });
    setLapInputs(nextInputs);
  }, [entries]);

  const isReorderDisabled = disabled || savingOrder || localOrdering;
  const isBestLapDisabled = disabled || savingLap;
  const isStatusDisabled = disabled || statusUpdating;

  const saveOrder = (nextOrder: DriverStanding[]) => {
    const payload = nextOrder.map((entry, index) => ({
      driverId: entry.driver_id,
      displayPosition: index + 1
    }));
    setOrderedEntries(
      nextOrder.map((entry, index) => ({
        ...entry,
        display_position: index + 1
      }))
    );
    setLocalOrdering(true);
    Promise.resolve(onReorder(payload))
      .catch((error: unknown) => {
        notify({
          variant: "error",
          title: "Unable to update order",
          description: error instanceof Error ? error.message : "Manual order could not be saved."
        });
        setOrderedEntries(sortEntries(entries));
      })
      .finally(() => setLocalOrdering(false));
  };

  const moveDriver = (driverId: string, direction: -1 | 1) => {
    if (isReorderDisabled) return;
    const currentIndex = orderedEntries.findIndex((driver) => driver.driver_id === driverId);
    const targetIndex = currentIndex + direction;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= orderedEntries.length) return;
    const next = [...orderedEntries];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    saveOrder(next);
  };

  const handleBestLapSave = (driverId: string) => {
    const input = lapInputs[driverId] ?? "";
    const parsed = parseLapInput(input);
    if (parsed === undefined) {
      notify({
        variant: "error",
        title: "Invalid lap time",
        description: "Use mm:ss.sss or ss.sss format."
      });
      return;
    }

    Promise.resolve(onUpdateBestLap(driverId, parsed))
      .then(() => {
        setLapInputs((prev) => ({
          ...prev,
          [driverId]: formatInputValue(parsed)
        }));
      })
      .catch((error: unknown) => {
        notify({
          variant: "error",
          title: "Unable to update lap",
          description: error instanceof Error ? error.message : "Best lap could not be saved."
        });
      });
  };

  const handleStatusChange = (driverId: string, status: string) => {
    Promise.resolve(onUpdateStatus(driverId, status)).catch((error: unknown) => {
      notify({
        variant: "error",
        title: "Unable to update status",
        description: error instanceof Error ? error.message : "Driver status update failed."
      });
    });
  };

  const headline = useMemo(() => {
    if (localOrdering || savingOrder) return "Saving order…";
    if (disabled) return "Session locked";
    return "Click arrows to adjust running order";
  }, [disabled, localOrdering, savingOrder]);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Race Order</p>
          <h2 className="text-xl font-semibold text-white">Manual Running Order</h2>
        </div>
        <p className="text-xs text-white/50">{headline}</p>
      </div>
      <div className="space-y-2">
        {orderedEntries.map((driver, index) => (
          <article
            key={driver.driver_id}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex items-center gap-3 sm:w-48">
              <div className="flex flex-col gap-1">
                <button
                  className="rounded-full border border-white/20 p-1 text-white/80 hover:bg-white/10 disabled:opacity-30"
                  onClick={() => moveDriver(driver.driver_id, -1)}
                  disabled={isReorderDisabled || index === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  className="rounded-full border border-white/20 p-1 text-white/80 hover:bg-white/10 disabled:opacity-30"
                  onClick={() => moveDriver(driver.driver_id, 1)}
                  disabled={isReorderDisabled || index === orderedEntries.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <div>
                <span className="inline-flex rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">
                  P{index + 1}
                </span>
                <p className="mt-1 text-lg font-semibold text-white">
                  #{driver.car_number} {driver.driver_name}
                </p>
                <p className="text-xs text-white/60">{driver.team_name}</p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Status</p>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                  value={driver.status}
                  onChange={(event) => handleStatusChange(driver.driver_id, event.target.value)}
                  disabled={isStatusDisabled}
                >
                  {DRIVER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Best Lap</p>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-white"
                  placeholder="1:32.457"
                  value={lapInputs[driver.driver_id] ?? ""}
                  onChange={(event) =>
                    setLapInputs((prev) => ({ ...prev, [driver.driver_id]: event.target.value }))
                  }
                  onBlur={() => handleBestLapSave(driver.driver_id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleBestLapSave(driver.driver_id);
                    }
                  }}
                  disabled={isBestLapDisabled}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Last Saved</p>
                <p className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white/80">
                  {driver.best_lap_ms ? formatLapTime(driver.best_lap_ms) : "—"}
                </p>
              </div>
            </div>
          </article>
        ))}
        {!orderedEntries.length && (
          <p className="text-sm text-white/60">No drivers registered in this session yet.</p>
        )}
      </div>
    </section>
  );
};

export default RaceOrderPanel;
