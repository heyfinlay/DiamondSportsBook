import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createSession,
  deleteSessionDeep,
  fetchDriverStandings,
  fetchSessionDetail,
  fetchRaceEvents,
  initializeRace,
  invalidateLastLap,
  logLap,
  logPenalty,
  logPitEvent,
  type DriverStanding,
  type RaceEvent
} from "@domains/timing/api/timingApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";

const HOTKEYS = [
  "Q",
  "W",
  "E",
  "R",
  "T",
  "Y",
  "U",
  "I",
  "O",
  "P",
  "A",
  "S",
  "D",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "Z",
  "X",
  "C",
  "V",
  "B",
  "N",
  "M"
];

const RaceControlPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    name: "",
    trackName: "",
    lapsTarget: "",
    driversText: ""
  });
  const [lapError, setLapError] = useState<string | null>(null);
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [controlMessageTone, setControlMessageTone] = useState<"success" | "error">(
    "success"
  );
  const [invalidateDriverId, setInvalidateDriverId] = useState("");
  const [penaltyForm, setPenaltyForm] = useState({
    driverId: "",
    seconds: "5",
    reason: ""
  });
  const [pitForm, setPitForm] = useState({
    driverId: "",
    durationMs: ""
  });

  useTimingRealtime(sessionId);

  const clearControlMessage = () => setControlMessage(null);
  const setControlStatus = (message: string, tone: "success" | "error" = "success") => {
    setControlMessageTone(tone);
    setControlMessage(message);
  };

  const refreshTimingData = () => {
    if (!sessionId) return;
    queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["timing-events", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["live-penalties", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["live-pit-events", sessionId] });
  };

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

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      navigate(`/control/${session.id}`);
    }
  });

  const initializeRaceMutation = useMutation({
    mutationFn: () => initializeRace(sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
    }
  });

  const logLapMutation = useMutation({
    mutationFn: logLap,
    onMutate: () => setLapError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
      setLapError(null);
    },
    onError: (error: Error) => {
      setLapError(error.message);
    }
  });

  const invalidateLapMutation = useMutation({
    mutationFn: (driverId: string) => invalidateLastLap(driverId),
    onMutate: () => clearControlMessage(),
    onSuccess: () => {
      setControlStatus("Last lap invalidated.");
      refreshTimingData();
    },
    onError: (error: Error) => {
      setControlStatus(error.message, "error");
    }
  });

  const logPenaltyMutation = useMutation({
    mutationFn: logPenalty,
    onMutate: () => clearControlMessage(),
    onSuccess: () => {
      setControlStatus("Penalty recorded.");
      refreshTimingData();
      setPenaltyForm((prev) => ({ ...prev, reason: "" }));
    },
    onError: (error: Error) => {
      setControlStatus(error.message, "error");
    }
  });

  const logPitEventMutation = useMutation({
    mutationFn: logPitEvent,
    onMutate: () => clearControlMessage(),
    onSuccess: () => {
      setControlStatus("Pit event logged.");
      refreshTimingData();
      setPitForm((prev) => ({ ...prev, durationMs: "" }));
    },
    onError: (error: Error) => setControlStatus(error.message, "error")
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSessionDeep,
    onMutate: () => clearControlMessage(),
    onSuccess: () => {
      setControlStatus("Session deleted.");
      if (sessionId) {
        queryClient.removeQueries({ queryKey: ["timing-session", sessionId] });
        queryClient.removeQueries({ queryKey: ["timing-drivers", sessionId] });
        queryClient.removeQueries({ queryKey: ["timing-events", sessionId] });
      }
      navigate("/control");
    },
    onError: (error: Error) => setControlStatus(error.message, "error")
  });

  const handleCreateSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const drivers = parseDrivers(formState.driversText);

    createSessionMutation.mutate({
      name: formState.name,
      trackName: formState.trackName,
      lapsTarget: formState.lapsTarget ? Number(formState.lapsTarget) : undefined,
      drivers
    });
  };

  const handleLogLap = (driver: DriverStanding) => {
    const nextLap = driver.laps_completed + 1;
    const lapInput = window.prompt(
      `Lap ${nextLap} time (ms) for ${driver.driver_name}`,
      "90000"
    );
    if (!lapInput) return;
    const lapMs = Number(lapInput);
    if (Number.isNaN(lapMs) || lapMs <= 0) {
      alert("Invalid lap time");
      return;
    }
    logLapMutation.mutate({
      driverId: driver.driver_id,
      lapNumber: nextLap,
      lapMs
    });
  };

  const handleInvalidateLap = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invalidateDriverId) {
      setControlStatus("Select a driver to invalidate.", "error");
      return;
    }
    invalidateLapMutation.mutate(invalidateDriverId);
  };

  const handleLogPenaltySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId) return;
    const seconds = Number(penaltyForm.seconds);
    if (!penaltyForm.reason.trim()) {
      setControlStatus("Provide a penalty reason.", "error");
      return;
    }
    if (!Number.isFinite(seconds) || seconds <= 0) {
      setControlStatus("Penalty seconds must be greater than zero.", "error");
      return;
    }
    logPenaltyMutation.mutate({
      sessionId,
      driverId: penaltyForm.driverId || null,
      reason: penaltyForm.reason.trim(),
      seconds
    });
  };

  const handleLogPitSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pitForm.driverId) {
      setControlStatus("Select a driver for the pit event.", "error");
      return;
    }
    const duration = pitForm.durationMs ? Number(pitForm.durationMs) : null;
    if (pitForm.durationMs && (Number.isNaN(duration) || duration <= 0)) {
      setControlStatus("Enter a valid pit duration in ms.", "error");
      return;
    }
    logPitEventMutation.mutate({
      driverId: pitForm.driverId,
      durationMs: duration
    });
  };

  const handleDeleteSession = () => {
    if (!sessionId) return;
    const confirmed = window.confirm(
      "Delete this session and all timing data? This cannot be undone."
    );
    if (!confirmed) return;
    deleteSessionMutation.mutate(sessionId);
  };

  const promptPitForDriver = (driver: DriverStanding) => {
    const durationInput = window.prompt(
      `Pit duration (ms) for ${driver.driver_name}`,
      "25000"
    );
    if (!durationInput) return;
    const durationMs = Number(durationInput);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      setControlStatus("Enter a valid pit duration.", "error");
      return;
    }
    logPitEventMutation.mutate({
      driverId: driver.driver_id,
      durationMs
    });
  };

  const promptPenaltyForDriver = (driver: DriverStanding) => {
    if (!sessionId) return;
    const secondsInput = window.prompt(
      `Penalty seconds for ${driver.driver_name}`,
      "5"
    );
    if (!secondsInput) return;
    const seconds = Number(secondsInput);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      setControlStatus("Penalty seconds must be greater than zero.", "error");
      return;
    }
    const reason = window.prompt("Penalty reason", "Track limits");
    if (!reason) return;
    logPenaltyMutation.mutate({
      sessionId,
      driverId: driver.driver_id,
      seconds,
      reason: reason.trim()
    });
  };

  const handleQuickInvalidate = (driver: DriverStanding) => {
    const confirmInvalidate = window.confirm(
      `Invalidate last lap for ${driver.driver_name}?`
    );
    if (!confirmInvalidate) return;
    invalidateLapMutation.mutate(driver.driver_id);
  };

  if (!sessionId) {
    return (
      <CreateSessionForm
        formState={formState}
        onChange={setFormState}
        onSubmit={handleCreateSession}
        submitting={createSessionMutation.isPending}
      />
    );
  }

  const drivers = driversQuery.data ?? [];

  const driverHotkeys = useMemo(() => {
    const map = new Map<string, DriverStanding>();
    drivers.forEach((driver) => {
      const label = getHotkeyLabel(driver).toUpperCase();
      map.set(label, driver);
    });
    return map;
  }, [drivers]);

  useEffect(() => {
    if (!sessionId) return;

    const handler = (event: KeyboardEvent) => {
      if (!drivers.length) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      const key = event.key.toUpperCase();
      const driver = driverHotkeys.get(key);
      if (!driver) return;

      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        handleQuickInvalidate(driver);
        return;
      }

      if (event.altKey) {
        event.preventDefault();
        promptPitForDriver(driver);
        return;
      }

      if (event.shiftKey) {
        event.preventDefault();
        promptPenaltyForDriver(driver);
        return;
      }

      event.preventDefault();
      handleLogLap(driver);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    drivers,
    driverHotkeys,
    handleLogLap,
    handleQuickInvalidate,
    promptPitForDriver,
    promptPenaltyForDriver,
    sessionId
  ]);

  return (
    <div className="space-y-8">
      <SessionHeader
        sessionId={sessionId}
        name={sessionQuery.data?.name ?? "Loading"}
        track={sessionQuery.data?.track_name ?? "—"}
        phase={sessionQuery.data?.phase ?? "setup"}
        trackStatus={sessionQuery.data?.track_status ?? "green"}
        lapsTarget={sessionQuery.data?.laps_target ?? undefined}
        onStartRace={() => initializeRaceMutation.mutate()}
        canStartRace={sessionQuery.data?.phase !== "race"}
      />

      <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Drivers</h2>
              <p className="text-sm text-white/60">
                Click “Log Lap” to record manual times.
              </p>
              <p className="text-xs text-white/40">
                Hotkeys: letter=lap, Shift+letter=penalty, Alt+letter=pit, Ctrl+letter=invalidate.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 px-4 py-2">
              Session: {sessionId}
            </div>
          </header>
          <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
            <div className="grid grid-cols-6 gap-3 text-xs uppercase tracking-wider text-white/60">
              <span>Driver</span>
              <span>Lap</span>
              <span>Last</span>
              <span>Best</span>
              <span>Status</span>
              <span>Hotkey / Actions</span>
            </div>
            <div className="mt-3 space-y-2">
              {driversQuery.isLoading && (
                <p className="text-sm text-white/60">Loading drivers…</p>
              )}
              {lapError && (
                <p className="text-sm font-semibold text-red-400">{lapError}</p>
              )}
              {drivers.map((driver) => (
                <div
                  key={driver.driver_id}
                  className="grid grid-cols-6 items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-sm"
                >
                  <div className="font-semibold">
                    #{driver.car_number} {driver.driver_name}
                  </div>
                  <div>{driver.laps_completed}</div>
                  <div>{driver.last_lap_ms ? formatLap(driver.last_lap_ms) : "—"}</div>
                  <div>{driver.best_lap_ms ? formatLap(driver.best_lap_ms) : "—"}</div>
                  <div className="capitalize">{driver.status}</div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                      Hotkey: {getHotkeyLabel(driver)}
                    </p>
                    <div className="space-y-1">
                      <button
                        className="rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand"
                        onClick={() => handleLogLap(driver)}
                      >
                        Log Lap
                      </button>
                      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.3em]">
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50"
                          onClick={() => promptPitForDriver(driver)}
                        >
                          Pit
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50"
                          onClick={() => promptPenaltyForDriver(driver)}
                        >
                          Penalty
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50"
                          onClick={() => handleQuickInvalidate(driver)}
                        >
                          Invalidate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Race Actions</h3>
                <p className="text-sm text-white/60">
                  Everything here writes to the timing log per the manifesto.
                </p>
              </div>
              {controlMessage && (
                <p
                  className={`text-sm font-semibold ${
                    controlMessageTone === "success" ? "text-emerald-300" : "text-red-400"
                  }`}
                >
                  {controlMessage}
                </p>
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <form
                className="rounded-2xl border border-white/5 bg-black/40 p-4"
                onSubmit={handleInvalidateLap}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Invalidate Last Lap
                </p>
                <select
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
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
                  className="mt-3 w-full rounded-2xl bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
                  disabled={invalidateLapMutation.isPending}
                >
                  {invalidateLapMutation.isPending ? "Invalidating…" : "Invalidate Lap"}
                </button>
              </form>
              <form
                className="rounded-2xl border border-white/5 bg-black/40 p-4"
                onSubmit={handleLogPenaltySubmit}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Log Penalty
                </p>
                <select
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                  value={penaltyForm.driverId}
                  onChange={(event) =>
                    setPenaltyForm((prev) => ({ ...prev, driverId: event.target.value }))
                  }
                >
                  <option value="">Apply to session</option>
                  {drivers.map((driver) => (
                    <option key={driver.driver_id} value={driver.driver_id}>
                      #{driver.car_number} {driver.driver_name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    className="w-24 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                    value={penaltyForm.seconds}
                    onChange={(event) =>
                      setPenaltyForm((prev) => ({ ...prev, seconds: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    className="flex-1 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                    placeholder="Reason"
                    value={penaltyForm.reason}
                    onChange={(event) =>
                      setPenaltyForm((prev) => ({ ...prev, reason: event.target.value }))
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-2xl bg-brand px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
                  disabled={logPenaltyMutation.isPending}
                >
                  {logPenaltyMutation.isPending ? "Logging…" : "Record Penalty"}
                </button>
              </form>
              <form
                className="rounded-2xl border border-white/5 bg-black/40 p-4"
                onSubmit={handleLogPitSubmit}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Log Pit Event
                </p>
                <select
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                  value={pitForm.driverId}
                  onChange={(event) =>
                    setPitForm((prev) => ({ ...prev, driverId: event.target.value }))
                  }
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
                  min={1}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                  placeholder="Duration (ms)"
                  value={pitForm.durationMs}
                  onChange={(event) =>
                    setPitForm((prev) => ({ ...prev, durationMs: event.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="mt-3 w-full rounded-2xl bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
                  disabled={logPitEventMutation.isPending}
                >
                  {logPitEventMutation.isPending ? "Logging…" : "Record Pit"}
                </button>
              </form>
              <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-red-300">
                  Dangerous
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Super admins only. Permanently deletes this session.
                </p>
                <button
                  type="button"
                  className="mt-4 w-full rounded-2xl border border-red-500/30 bg-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-200 disabled:opacity-40"
                  onClick={handleDeleteSession}
                  disabled={deleteSessionMutation.isPending}
                >
                  {deleteSessionMutation.isPending ? "Deleting…" : "Delete Session"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-xl font-semibold">Event Feed</h2>
          {eventsQuery.isLoading && (
            <p className="text-sm text-white/60">Loading events…</p>
          )}
          <div className="max-h-[420px] space-y-3 overflow-y-auto">
            {eventsQuery.data?.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                drivers={drivers}
              />
            ))}
            {eventsQuery.data && eventsQuery.data.length === 0 && (
              <p className="text-sm text-white/60">No events logged yet.</p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
};

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
}) => {
  return (
    <div className="max-w-3xl rounded-3xl border border-white/10 bg-black/50 p-8">
      <h1 className="text-3xl font-semibold">Create Session</h1>
      <p className="mt-2 text-sm text-white/60">
        Enter track details and seed drivers (one per line: Car, Driver, Team).
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">
            Session Name
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
            value={formState.name}
            onChange={(e) => onChange({ ...formState, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Track
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
              value={formState.trackName}
              onChange={(e) =>
                onChange({ ...formState, trackName: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Target Laps
            </label>
            <input
              type="number"
              min={1}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
              value={formState.lapsTarget}
              onChange={(e) =>
                onChange({ ...formState, lapsTarget: e.target.value })
              }
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">
            Drivers
          </label>
          <textarea
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
            rows={6}
            placeholder="22, Max Torque, Redwood Racing"
            value={formState.driversText}
            onChange={(e) =>
              onChange({ ...formState, driversText: e.target.value })
            }
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
};

const SessionHeader = ({
  sessionId,
  name,
  track,
  phase,
  trackStatus,
  lapsTarget,
  onStartRace,
  canStartRace
}: {
  sessionId: string;
  name: string;
  track: string;
  phase: string;
  trackStatus: string;
  lapsTarget?: number;
  onStartRace: () => void;
  canStartRace: boolean | undefined;
}) => {
  const safePhase = phase || "setup";
  const phaseDisplay = useMemo(
    () => safePhase.charAt(0).toUpperCase() + safePhase.slice(1),
    [safePhase]
  );

  return (
    <header className="grid gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 md:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Session
        </p>
        <h1 className="text-3xl font-semibold">{name}</h1>
        <p className="text-white/60">
          {track} · Target laps: {lapsTarget ?? "—"}
        </p>
        <p className="text-xs text-white/50">ID: {sessionId}</p>
      </div>
      <div className="flex items-center justify-end gap-4">
        <div className="rounded-2xl border border-white/10 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Phase
          </p>
          <p className="text-xl font-semibold">{phaseDisplay}</p>
          <p className="text-sm text-white/60">Track: {trackStatus}</p>
        </div>
        <button
          className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40"
          disabled={!canStartRace}
          onClick={onStartRace}
        >
          Start Race
        </button>
      </div>
    </header>
  );
};

const parseDrivers = (input: string) => {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [car, name, team] = line.split(",").map((token) => token.trim());
      return {
        car_number: Number(car) || 0,
        display_name: name || `Driver ${car ?? ""}`,
        team_name: team || "Privateer"
      };
    });
};

const formatLap = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
    .toString()
    .padStart(3, "0")}`;
};

const formatDurationSeconds = (ms?: number | null) => {
  if (!ms || ms <= 0) return null;
  return `${(ms / 1000).toFixed(1)}s`;
};

const getHotkeyLabel = (driver: DriverStanding) => {
  const index = (driver.position ?? 1) - 1;
  return HOTKEYS[index] ?? `#${index + 1}`;
};

const EventCard = ({
  event,
  drivers
}: {
  event: RaceEvent;
  drivers: DriverStanding[];
}) => {
  const timestamp = new Date(event.created_at).toLocaleTimeString();
  const description = formatEventDescription(event, drivers);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
        {timestamp}
      </p>
      <p className="mt-1 font-semibold text-white">{event.type}</p>
      <p className="text-white/70">{description}</p>
    </div>
  );
};

const formatEventDescription = (
  event: RaceEvent,
  drivers: DriverStanding[]
) => {
  if (event.type === "lap_logged") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    const lapNumber = event.payload.lap_number;
    const lapMs = event.payload.lap_ms;
    return driver
      ? `${driver.driver_name} logged lap ${lapNumber} at ${formatLap(lapMs)}`
      : `Driver ${event.payload.driver_id} logged lap ${lapNumber}`;
  }

  if (event.type === "lap_invalidated") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    const lapNumber = event.payload.lap_number;
    return driver
      ? `${driver.driver_name}'s lap ${lapNumber} invalidated.`
      : `Lap ${lapNumber} invalidated for driver ${event.payload.driver_id ?? "unknown"}.`;
  }

  if (event.type === "penalty_logged") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    const seconds = event.payload.seconds;
    const reason = event.payload.reason;
    if (driver) {
      return `${driver.driver_name} assessed ${seconds}s penalty (${reason}).`;
    }
    return `${seconds}s penalty issued: ${reason}`;
  }

  if (event.type === "pit_event_logged") {
    const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
    const durationText = formatDurationSeconds(event.payload.duration_ms);
    const base = driver
      ? `${driver.driver_name} pit stop`
      : `Driver ${event.payload.driver_id ?? "unknown"} pit stop`;
    return durationText ? `${base} (${durationText}).` : `${base} logged.`;
  }

  if (event.type === "race_initialized") {
    return "Race initialized and drivers set to running.";
  }

  if (event.type === "session_created") {
    return `Session created (${event.payload.name ?? "Untitled"})`;
  }

  return JSON.stringify(event.payload);
};

export default RaceControlPage;
