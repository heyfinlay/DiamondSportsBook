import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  createSession,
  deleteSessionDeep,
  fetchDriverStandings,
  fetchRaceEvents,
  fetchSessionDetail,
  initializeRace,
  invalidateLastLap,
  logLap,
  logPenalty,
  logPitEvent,
  type DriverStanding,
  type RaceEvent
} from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useToast } from "@app/components/ToastProvider";
import { usePermissions } from "@lib/auth/usePermissions";

const HOTKEYS = ["Q","W","E","R","T","Y","U","I","O","P","A","S","D","F","G","H","J","K","L","Z","X","C","V","B","N","M"];

const RaceControlPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canManageRace } = usePermissions();
  const lapInputRef = useRef<HTMLInputElement | null>(null);

  const [createFormState, setCreateFormState] = useState({
    name: "",
    trackName: "",
    lapsTarget: "",
    driversText: ""
  });
  const [lapForm, setLapForm] = useState({ driverId: "", lapMs: "" });
  const [penaltyForm, setPenaltyForm] = useState({ driverId: "", seconds: "5", reason: "" });
  const [pitForm, setPitForm] = useState({ driverId: "", durationMs: "" });
  const [invalidateDriverId, setInvalidateDriverId] = useState("");

  useTimingRealtime(sessionId);

  const sessionQuery = useQuery({
    queryKey: ["timing-session", sessionId],
    queryFn: () => fetchSessionDetail(sessionId!),
    enabled: !!sessionId
  });

  const driversQuery = useQuery({
    queryKey: ["timing-drivers", sessionId],
    queryFn: () => fetchDriverStandings(sessionId!),
    enabled: !!sessionId
  });

  const eventsQuery = useQuery({
    queryKey: ["timing-events", sessionId],
    queryFn: () => fetchRaceEvents(sessionId!),
    enabled: !!sessionId
  });

  const drivers = driversQuery.data ?? [];

  const refreshTimingData = () => {
    if (!sessionId) return;
    queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["timing-events", sessionId] });
  };

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      toast({ variant: "success", title: "Session created" });
      navigate(`/control/${session.id}`);
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to create session", description: error.message })
  });

  const initializeRaceMutation = useMutation({
    mutationFn: () => initializeRace(sessionId!),
    onSuccess: () => {
      toast({ variant: "success", title: "Race initialized" });
      queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Cannot start race", description: error.message })
  });

  const logLapMutation = useMutation({
    mutationFn: logLap,
    onSuccess: (_, vars) => {
      toast({ variant: "success", title: "Lap recorded", description: `Driver ${vars.driverId}` });
      setLapForm({ driverId: vars.driverId, lapMs: "" });
      refreshTimingData();
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Lap logging failed", description: error.message })
  });

  const invalidateLapMutation = useMutation({
    mutationFn: (driverId: string) => invalidateLastLap(driverId),
    onSuccess: () => {
      toast({ variant: "success", title: "Lap invalidated" });
      refreshTimingData();
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to invalidate lap", description: error.message })
  });

  const logPenaltyMutation = useMutation({
    mutationFn: logPenalty,
    onSuccess: () => {
      toast({ variant: "success", title: "Penalty recorded" });
      refreshTimingData();
      setPenaltyForm((prev) => ({ ...prev, reason: "" }));
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to log penalty", description: error.message })
  });

  const logPitEventMutation = useMutation({
    mutationFn: logPitEvent,
    onSuccess: () => {
      toast({ variant: "success", title: "Pit event logged" });
      refreshTimingData();
      setPitForm((prev) => ({ ...prev, durationMs: "" }));
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to log pit event", description: error.message })
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSessionDeep,
    onSuccess: () => {
      toast({ variant: "success", title: "Session deleted" });
      navigate("/control");
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to delete session", description: error.message })
  });

  const driverById = useMemo(() => {
    const map = new Map<string, DriverStanding>();
    drivers.forEach((driver) => map.set(driver.driver_id, driver));
    return map;
  }, [drivers]);

  useEffect(() => {
    if (!sessionId) return;
    const handler = (event: KeyboardEvent) => {
      if (!drivers.length) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const driver = driverById.get(
        drivers.find((d, index) => HOTKEYS[index] === event.key.toUpperCase())?.driver_id ?? ""
      );
      if (!driver) return;
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        invalidateLapMutation.mutate(driver.driver_id);
        return;
      }
      if (event.shiftKey) {
        event.preventDefault();
        setPenaltyForm((prev) => ({ ...prev, driverId: driver.driver_id }));
        return;
      }
      if (event.altKey) {
        event.preventDefault();
        setPitForm((prev) => ({ ...prev, driverId: driver.driver_id }));
        return;
      }
      event.preventDefault();
      setLapForm({ driverId: driver.driver_id, lapMs: "" });
      lapInputRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drivers, driverById, invalidateLapMutation, sessionId]);

  if (!sessionId) {
    return (
      <CreateSessionForm
        formState={createFormState}
        onChange={setCreateFormState}
        onSubmit={(event) => {
          event.preventDefault();
          const drivers = parseDrivers(createFormState.driversText);
          createSessionMutation.mutate({
            name: createFormState.name,
            trackName: createFormState.trackName,
            lapsTarget: createFormState.lapsTarget ? Number(createFormState.lapsTarget) : undefined,
            drivers
          });
        }}
        submitting={createSessionMutation.isPending}
      />
    );
  }

  const session = sessionQuery.data;

  return (
    <div className="space-y-8">
      <SessionHeader
        sessionId={sessionId}
        name={session?.name ?? "Loading"}
        track={session?.track_name ?? "—"}
        phase={session?.phase ?? "setup"}
        trackStatus={session?.track_status ?? "green"}
        lapsTarget={session?.laps_target}
        onStartRace={() => initializeRaceMutation.mutate()}
        canStartRace={canManageRace && session?.phase !== "race"}
        onDelete={canManageRace ? () => deleteSessionMutation.mutate(sessionId) : undefined}
      />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Drivers</p>
              <h2 className="text-xl font-semibold text-white">Timing Console</h2>
            </div>
            <p className="text-xs text-white/50">
              Hotkeys: letter lap · Shift penalty · Alt pit · Ctrl invalidate
            </p>
          </header>
          <div className="mt-4 space-y-2">
            {driversQuery.isLoading && (
              <p className="text-sm text-white/60">Loading drivers…</p>
            )}
            {drivers.map((driver, index) => (
              <div
                key={driver.driver_id}
                className="grid grid-cols-[1.2fr,0.6fr,0.6fr,0.6fr,1fr] items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm"
              >
                <div className="font-semibold text-white">
                  #{driver.car_number} {driver.driver_name}
                  <span className="ml-2 text-[10px] uppercase tracking-[0.3em] text-white/50">
                    {HOTKEYS[index] ?? "?"}
                  </span>
                </div>
                <div className="text-white/70">Lap {driver.laps_completed}</div>
                <div className="text-white/70">
                  {driver.last_lap_ms ? formatLap(driver.last_lap_ms) : "—"}
                </div>
                <div className="text-white/70">
                  {driver.best_lap_ms ? formatLap(driver.best_lap_ms) : "—"}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.3em]">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50"
                    onClick={() => setLapForm({ driverId: driver.driver_id, lapMs: "" })}
                  >
                    Lap
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50"
                    onClick={() => setPitForm((prev) => ({ ...prev, driverId: driver.driver_id }))}
                  >
                    Pit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50"
                    onClick={() =>
                      setPenaltyForm((prev) => ({ ...prev, driverId: driver.driver_id }))
                    }
                  >
                    Penalty
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50"
                    onClick={() => invalidateLapMutation.mutate(driver.driver_id)}
                  >
                    Invalidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <ControlCard title="Log Lap">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!lapForm.driverId) {
                  toast({ variant: "error", title: "Select a driver" });
                  return;
                }
                const lapMs = Number(lapForm.lapMs);
                if (!Number.isFinite(lapMs) || lapMs <= 0) {
                  toast({ variant: "error", title: "Invalid lap time" });
                  return;
                }
                const nextLap =
                  (drivers.find((d) => d.driver_id === lapForm.driverId)?.laps_completed ?? 0) + 1;
                logLapMutation.mutate({
                  driverId: lapForm.driverId,
                  lapNumber: nextLap,
                  lapMs
                });
              }}
            >
              <select
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={lapForm.driverId}
                onChange={(event) => setLapForm((prev) => ({ ...prev, driverId: event.target.value }))}
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    #{driver.car_number} {driver.driver_name}
                  </option>
                ))}
              </select>
              <input
                ref={lapInputRef}
                type="number"
                min="1"
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                placeholder="Lap time (ms)"
                value={lapForm.lapMs}
                onChange={(event) => setLapForm((prev) => ({ ...prev, lapMs: event.target.value }))}
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-brand py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
                disabled={logLapMutation.isPending}
              >
                {logLapMutation.isPending ? "Logging…" : "Log Lap"}
              </button>
            </form>
          </ControlCard>

          <ControlCard title="Penalty">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!sessionId) return;
                const seconds = Number(penaltyForm.seconds);
                if (!penaltyForm.reason.trim()) {
                  toast({ variant: "error", title: "Provide a reason" });
                  return;
                }
                if (!Number.isFinite(seconds) || seconds <= 0) {
                  toast({ variant: "error", title: "Penalty seconds invalid" });
                  return;
                }
                logPenaltyMutation.mutate({
                  sessionId,
                  driverId: penaltyForm.driverId || null,
                  reason: penaltyForm.reason.trim(),
                  seconds
                });
              }}
            >
              <select
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={penaltyForm.driverId}
                onChange={(event) =>
                  setPenaltyForm((prev) => ({ ...prev, driverId: event.target.value }))
                }
              >
                <option value="">Session-level penalty</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    #{driver.car_number} {driver.driver_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                placeholder="Seconds"
                value={penaltyForm.seconds}
                onChange={(event) =>
                  setPenaltyForm((prev) => ({ ...prev, seconds: event.target.value }))
                }
              />
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                placeholder="Reason"
                value={penaltyForm.reason}
                onChange={(event) =>
                  setPenaltyForm((prev) => ({ ...prev, reason: event.target.value }))
                }
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-white/80 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
                disabled={logPenaltyMutation.isPending}
              >
                {logPenaltyMutation.isPending ? "Recording…" : "Log Penalty"}
              </button>
            </form>
          </ControlCard>

          <ControlCard title="Pit Event">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!pitForm.driverId) {
                  toast({ variant: "error", title: "Select a driver" });
                  return;
                }
                const duration = pitForm.durationMs ? Number(pitForm.durationMs) : null;
                if (pitForm.durationMs && (!Number.isFinite(duration!) || duration! <= 0)) {
                  toast({ variant: "error", title: "Invalid duration" });
                  return;
                }
                logPitEventMutation.mutate({
                  driverId: pitForm.driverId,
                  durationMs: duration
                });
              }}
            >
              <select
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={pitForm.driverId}
                onChange={(event) => setPitForm((prev) => ({ ...prev, driverId: event.target.value }))}
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    #{driver.car_number} {driver.driver_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                placeholder="Duration (ms)"
                value={pitForm.durationMs}
                onChange={(event) =>
                  setPitForm((prev) => ({ ...prev, durationMs: event.target.value }))
                }
              />
              <button
                type="submit"
                className="w-full rounded-2xl border border-white/30 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-40"
                disabled={logPitEventMutation.isPending}
              >
                {logPitEventMutation.isPending ? "Logging…" : "Log Pit Event"}
              </button>
            </form>
          </ControlCard>

          <ControlCard title="Invalidate Last Lap">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!invalidateDriverId) {
                  toast({ variant: "error", title: "Select a driver" });
                  return;
                }
                invalidateLapMutation.mutate(invalidateDriverId);
              }}
            >
              <select
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={invalidateDriverId}
                onChange={(event) => setInvalidateDriverId(event.target.value)}
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    #{driver.car_number} {driver.driver_name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-2xl border border-red-400/50 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-red-300 disabled:opacity-40"
                disabled={invalidateLapMutation.isPending}
              >
                {invalidateLapMutation.isPending ? "Invalidating…" : "Invalidate"}
              </button>
            </form>
          </ControlCard>
        </aside>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Event Log</h2>
          {eventsQuery.isLoading && (
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Updating…</span>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {eventsQuery.data?.map((event) => (
            <EventCard key={event.id} event={event} drivers={drivers} />
          ))}
          {!eventsQuery.data?.length && !eventsQuery.isLoading && (
            <p className="text-sm text-white/60">No events recorded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

const ControlCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
    <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
    <div className="mt-3">{children}</div>
  </div>
);

const CreateSessionForm = ({
  formState,
  onChange,
  onSubmit,
  submitting
}: {
  formState: { name: string; trackName: string; lapsTarget: string; driversText: string };
  onChange: (state: typeof formState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) => (
  <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-black/50 p-8">
    <h1 className="text-3xl font-semibold">Create Session</h1>
    <p className="mt-2 text-sm text-white/60">
      Enter track details and seed drivers (one per line: Car, Driver, Team).
    </p>
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-white/60">Session Name</label>
        <input
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
          value={formState.name}
          onChange={(e) => onChange({ ...formState, name: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">Track</label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
            value={formState.trackName}
            onChange={(e) => onChange({ ...formState, trackName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">Target Laps</label>
          <input
            type="number"
            min={1}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
            value={formState.lapsTarget}
            onChange={(e) => onChange({ ...formState, lapsTarget: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-white/60">Drivers</label>
        <textarea
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
          rows={6}
          placeholder="22, Max Torque, Redwood Racing"
          value={formState.driversText}
          onChange={(e) => onChange({ ...formState, driversText: e.target.value })}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-brand py-3 text-center text-base font-semibold uppercase tracking-widest text-black disabled:opacity-40"
      >
        {submitting ? "Creating…" : "Create Session"}
      </button>
    </form>
  </div>
);

const SessionHeader = ({
  sessionId,
  name,
  track,
  phase,
  trackStatus,
  lapsTarget,
  onStartRace,
  canStartRace,
  onDelete
}: {
  sessionId: string;
  name: string;
  track: string;
  phase: string;
  trackStatus: string;
  lapsTarget?: number;
  onStartRace: () => void;
  canStartRace?: boolean;
  onDelete?: () => void;
}) => (
  <header className="rounded-3xl border border-white/10 bg-black/40 p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Session {sessionId}</p>
        <h1 className="text-3xl font-semibold text-white">{name}</h1>
        <p className="text-white/60">
          {track} · Target laps: {lapsTarget ?? "—"}
        </p>
      </div>
      <div className="flex gap-3">
        <div className="rounded-2xl border border-white/10 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Phase</p>
          <p className="text-xl font-semibold capitalize">{phase}</p>
          <p className="text-sm text-white/60">Track: {trackStatus}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40"
            onClick={onStartRace}
            disabled={!canStartRace}
          >
            Start Race
          </button>
          {onDelete && (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/50 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-red-300"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
);

const parseDrivers = (input: string) =>
  input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [car, name, team] = line.split(",").map((token) => token.trim());
      return {
        car_number: Number(car) || index + 1,
        display_name: name || `Driver ${index + 1}`,
        team_name: team || "Privateer"
      };
    });

const formatLap = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
};

const formatDurationSeconds = (ms?: number | null) => {
  if (!ms || ms <= 0) return null;
  return `${(ms / 1000).toFixed(1)}s`;
};

const EventCard = ({ event, drivers }: { event: RaceEvent; drivers: DriverStanding[] }) => {
  const timestamp = new Date(event.created_at).toLocaleTimeString();
  const description = formatEventDescription(event, drivers);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{timestamp}</p>
      <p className="mt-1 font-semibold">{event.type}</p>
      <p className="text-white/70">{description}</p>
    </div>
  );
};

const formatEventDescription = (event: RaceEvent, drivers: DriverStanding[]) => {
  if (event.type === "lap_logged") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    return driver
      ? `${driver.driver_name} logged lap ${event.payload.lap_number} at ${formatLap(
          event.payload.lap_ms
        )}`
      : `Driver ${event.payload.driver_id} logged lap ${event.payload.lap_number}`;
  }
  if (event.type === "lap_invalidated") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    return driver
      ? `${driver.driver_name}'s lap ${event.payload.lap_number} invalidated`
      : `Lap invalidated for driver ${event.payload.driver_id ?? "unknown"}`;
  }
  if (event.type === "penalty_logged") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    const seconds = event.payload.seconds;
    const reason = event.payload.reason;
    return driver
      ? `${driver.driver_name} assessed ${seconds}s (${reason})`
      : `${seconds}s penalty issued: ${reason}`;
  }
  if (event.type === "pit_event_logged") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    const durationText = formatDurationSeconds(event.payload.duration_ms);
    const base = driver
      ? `${driver.driver_name} pit stop`
      : `Driver ${event.payload.driver_id ?? "unknown"} pit stop`;
    return durationText ? `${base} (${durationText})` : `${base} logged`;
  }
  if (event.type === "race_initialized") {
    return "Race initialized and drivers released.";
  }
  if (event.type === "session_created") {
    return `Session created (${event.payload.name ?? "Untitled"})`;
  }
  return JSON.stringify(event.payload);
};

export default RaceControlPage;
