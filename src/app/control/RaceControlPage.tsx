import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveSession,
  createSession,
  deleteSessionDeep,
  fetchControlEvents,
  fetchDriverStandings,
  fetchSessionDetail,
  fetchTimingResults,
  finishSession,
  forceEndSession,
  getRaceTime,
  initializeRace,
  logLap,
  logPenalty,
  logPitEvent,
  logControlError,
  pauseRace,
  resumeRace,
  setFlagStatus,
  updateDriverStatus,
  updateDriverTiming,
  updateDriverBestLap,
  updateDriverDisplayPositions,
  type ControlEvent,
  type DriverStanding,
  type SessionState,
  type TimingResult
} from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useToast } from "@app/components/ToastProvider";
import { usePermissions } from "@lib/auth/usePermissions";
import { TrackStatusBanner } from "@domains/timing/components/TrackStatusBanner";
import { sessionHasEnded } from "@domains/timing/utils/sessionLifecycle";
import { findDriverByNumberHotkey } from "./driverHotkeys";
import RaceOrderPanel from "./components/RaceOrderPanel";

const FLAG_OPTIONS = [
  { value: "green", label: "Green", className: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40" },
  { value: "yellow", label: "Yellow", className: "bg-amber-500/20 text-amber-200 border-amber-400/40" },
  { value: "vsc", label: "VSC", className: "bg-purple-500/20 text-purple-200 border-purple-400/40" },
  { value: "sc", label: "Safety Car", className: "bg-orange-500/20 text-orange-200 border-orange-400/40" },
  { value: "red", label: "Red", className: "bg-red-500/20 text-red-200 border-red-400/40" },
  { value: "checkered", label: "Checkered", className: "bg-white/10 text-white border-white/30" }
];

const RaceControlPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canManageRace } = usePermissions();
  const [createFormState, setCreateFormState] = useState({
    name: "",
    trackName: "",
    lapsTarget: "",
    driversText: ""
  });
  const [penaltyForm, setPenaltyForm] = useState({ driverId: "", seconds: "5", reason: "" });
  const [pitForm, setPitForm] = useState({ driverId: "" });

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

  const controlEventsQuery = useQuery({
    queryKey: ["control-events", sessionId],
    queryFn: () => fetchControlEvents(sessionId!),
    enabled: !!sessionId
  });

  const resultsQuery = useQuery({
    queryKey: ["timing-results", sessionId],
    queryFn: () => fetchTimingResults(sessionId!),
    enabled: !!sessionId && sessionHasEnded(sessionQuery.data)
  });

  const session = sessionQuery.data;
  const isRaceSession = session?.mode === "race";
  const isFinished = sessionHasEnded(session);
  const isArchived = Boolean(session?.archived_at);
  const controlsLocked = isFinished || isArchived;

  const drivers = driversQuery.data ?? [];
  const driversSortedForDisplay = useMemo(() => {
    const sorted = [...drivers];
    sorted.sort((a, b) => {
      const posA = a.position ?? Number.MAX_SAFE_INTEGER;
      const posB = b.position ?? Number.MAX_SAFE_INTEGER;
      if (posA !== posB) return posA - posB;

      const gapA = a.gap_to_leader_ms ?? Number.MAX_SAFE_INTEGER;
      const gapB = b.gap_to_leader_ms ?? Number.MAX_SAFE_INTEGER;
      if (gapA !== gapB) return gapA - gapB;

      return a.car_number - b.car_number;
    });
    return sorted;
  }, [drivers]);
  const recordError = (message: string) => {
    if (!sessionId) return;
    logControlError(sessionId, message).catch(() => {
      // best effort logging
    });
  };

  const refreshTimingData = () => {
    if (!sessionId) return;
    queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["live-standings", sessionId] });
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
      refreshTimingData();
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Lap logging failed", description: error.message });
    }
  });

  const logPenaltyMutation = useMutation({
    mutationFn: logPenalty,
    onSuccess: () => {
      toast({ variant: "success", title: "Penalty recorded" });
      refreshTimingData();
      setPenaltyForm((prev) => ({ ...prev, reason: "" }));
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to log penalty", description: error.message });
    }
  });

  const logPitEventMutation = useMutation({
    mutationFn: logPitEvent,
    onSuccess: () => {
      toast({ variant: "success", title: "Pit event logged" });
      refreshTimingData();
      setPitForm({ driverId: "" });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to log pit", description: error.message });
    }
  });

  const flagMutation = useMutation({
    mutationFn: ({ sessionId, flag }: { sessionId: string; flag: string }) =>
      setFlagStatus(sessionId, flag),
    onSuccess: () => {
      toast({ variant: "success", title: "Track status updated" });
      queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to update track", description: error.message });
    }
  });

  const pauseMutation = useMutation({
    mutationFn: (action: "pause" | "resume") =>
      action === "pause" ? pauseRace(sessionId!) : resumeRace(sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
      toast({ variant: "success", title: "Timer updated" });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to update timer", description: error.message });
    }
  });

  const forceEndSessionMutation = useMutation({
    mutationFn: (payload: { reason?: string; status?: "finished" | "aborted" | "completed" }) =>
      forceEndSession({ sessionId: sessionId!, status: payload.status, reason: payload.reason }),
    onSuccess: () => {
      toast({ variant: "success", title: "Session ended", description: "Race clock stopped." });
      queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["timing-results", sessionId] });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to end session", description: error.message });
    }
  });

  const archiveSessionMutation = useMutation({
    mutationFn: () => archiveSession(sessionId!),
    onSuccess: () => {
      toast({ variant: "success", title: "Session archived" });
      queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to archive session", description: error.message });
    }
  });

  const driverStatusMutation = useMutation({
    mutationFn: ({ driverId, status }: { driverId: string; status: string }) =>
      updateDriverStatus(driverId, status),
    onSuccess: () => {
      refreshTimingData();
      toast({ variant: "success", title: "Driver updated" });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to update driver", description: error.message });
    }
  });

  const updateRaceOrderMutation = useMutation({
    mutationFn: (updates: Array<{ driverId: string; displayPosition: number | null }>) =>
      updateDriverDisplayPositions(sessionId!, updates),
    onSuccess: () => {
      refreshTimingData();
      toast({ variant: "success", title: "Race order updated" });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to reorder grid", description: error.message });
    }
  });

  const updateBestLapMutation = useMutation({
    mutationFn: ({ driverId, bestLapMs }: { driverId: string; bestLapMs: number | null }) =>
      updateDriverBestLap(sessionId!, driverId, bestLapMs),
    onSuccess: () => {
      refreshTimingData();
      toast({ variant: "success", title: "Best lap updated" });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to update best lap", description: error.message });
    }
  });

  const updateLastLapMutation = useMutation({
    mutationFn: ({ driverId, lastLapMs }: { driverId: string; lastLapMs: number | null }) =>
      updateDriverTiming(sessionId!, driverId, { last_lap_ms: lastLapMs }),
    onSuccess: () => {
      refreshTimingData();
      toast({ variant: "success", title: "Last lap updated" });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to update last lap", description: error.message });
    }
  });

  const updateLapsMutation = useMutation({
    mutationFn: ({ driverId, laps }: { driverId: string; laps: number | null }) =>
      updateDriverTiming(sessionId!, driverId, { laps }),
    onSuccess: () => {
      refreshTimingData();
      toast({ variant: "success", title: "Laps updated" });
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to update laps", description: error.message });
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSessionDeep,
    onSuccess: () => {
      toast({ variant: "success", title: "Session deleted" });
      navigate("/control");
    },
    onError: (error: Error) => {
      const shouldArchive = error.message.includes("Archive") || error.message.includes("archive");
      toast({
        variant: "error",
        title: "Unable to delete session",
        description: shouldArchive
          ? "This session already has data linked to it. Archive the session instead to hide it while preserving timing history."
          : error.message
      });
    }
  });

  const finishSessionMutation = useMutation({
    mutationFn: () => finishSession(sessionId!),
    onSuccess: (results) => {
      toast({ variant: "success", title: "Race finished", description: "Final classification saved." });
      queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
      queryClient.setQueryData(["timing-results", sessionId], results);
    },
    onError: (error: Error) => {
      recordError(error.message);
      toast({ variant: "error", title: "Unable to finish race", description: error.message });
    }
  });

  const driverMap = useMemo(() => {
    const map = new Map<string, DriverStanding>();
    drivers.forEach((driver) => map.set(driver.driver_id, driver));
    return map;
  }, [drivers]);

  useEffect(() => {
    if (!sessionId || !session || controlsLocked || isRaceSession) return;

    const handler = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)
      ) {
        return;
      }

      const driver = findDriverByNumberHotkey(drivers, event.key);
      if (!driver) return;

      event.preventDefault();
      logLapMutation.mutate({ driverId: driver.driver_id });
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drivers, logLapMutation, sessionId, controlsLocked, isRaceSession, session]);

  if (!sessionId) {
    return (
      <CreateSessionForm
        formState={createFormState}
        onChange={setCreateFormState}
        onSubmit={(event) => {
          event.preventDefault();
          const driversInput = parseDrivers(createFormState.driversText);
          createSessionMutation.mutate({
            name: createFormState.name,
            trackName: createFormState.trackName,
            lapsTarget: createFormState.lapsTarget ? Number(createFormState.lapsTarget) : undefined,
            drivers: driversInput
          });
        }}
        submitting={createSessionMutation.isPending}
      />
    );
  }

  if (!canManageRace) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        You need race control permissions to access this console.
      </div>
    );
  }

  const raceClock = useRaceClock(sessionId, session);

  const handleForceEndSession = () => {
    if (!sessionId || isFinished) return;
    const confirmed = window.confirm("Force end this session and stop the race clock? This will not generate classification results.");
    if (!confirmed) return;
    const reasonInput = window.prompt("Reason for ending the session?", "Manual override")?.trim();
    forceEndSessionMutation.mutate({ reason: reasonInput || undefined });
  };

  const handleArchiveSession = () => {
    if (!sessionId || !isFinished || isArchived) return;
    const confirmed = window.confirm("Archive this session? It will no longer appear in live control lists but data remains accessible.");
    if (!confirmed) return;
    archiveSessionMutation.mutate();
  };

  const guardSessionLocked = (message: string) => {
    toast({
      variant: "error",
      title: isArchived ? "Session archived" : "Session ended",
      description: message
    });
  };

  const handleRaceOrderChange = (updates: Array<{ driverId: string; displayPosition: number | null }>) => {
    if (controlsLocked) {
      guardSessionLocked("Results are locked. Race order cannot be changed.");
      return Promise.resolve();
    }
    return updateRaceOrderMutation.mutateAsync(updates);
  };

  const handleBestLapUpdate = (driverId: string, bestLapMs: number | null) => {
    if (controlsLocked) {
      guardSessionLocked("Session finished. Best laps are locked.");
      return Promise.resolve();
    }
    return updateBestLapMutation.mutateAsync({ driverId, bestLapMs });
  };

  const handleLastLapUpdate = (driverId: string, lastLapMs: number | null) => {
    if (controlsLocked) {
      guardSessionLocked("Session finished. Last laps are locked.");
      return Promise.resolve();
    }
    return updateLastLapMutation.mutateAsync({ driverId, lastLapMs });
  };

  const handleLapsUpdate = (driverId: string, laps: number | null) => {
    if (controlsLocked) {
      guardSessionLocked("Session finished. Laps are locked.");
      return Promise.resolve();
    }
    return updateLapsMutation.mutateAsync({ driverId, laps });
  };

  const handleStatusUpdate = (driverId: string, status: string) => {
    if (controlsLocked) {
      guardSessionLocked("Driver statuses are locked after the checkered flag.");
      return Promise.resolve();
    }
    return driverStatusMutation.mutateAsync({ driverId, status });
  };

  const handleLap = (driverId: string) => {
    if (controlsLocked) {
      guardSessionLocked("Results are locked. No further laps can be logged.");
      return;
    }
    logLapMutation.mutate({ driverId });
  };

  const handleRetire = (driverId: string) => {
    if (controlsLocked) {
      guardSessionLocked("Driver statuses are locked after the checkered flag.");
      return;
    }
    driverStatusMutation.mutate({ driverId, status: "retired" });
  };

  return (
    <div className="space-y-8">
      <RaceControlHeader
        session={session}
        raceClock={raceClock}
        onStartRace={() => initializeRaceMutation.mutate()}
        onPause={() => pauseMutation.mutate("pause")}
        onResume={() => pauseMutation.mutate("resume")}
        onFlag={(flag) => flagMutation.mutate({ sessionId, flag })}
        onFinish={() => {
          const confirmed = window.confirm("Finish race and lock the results?");
          if (confirmed) finishSessionMutation.mutate();
        }}
        onForceEnd={handleForceEndSession}
        onDelete={() => {
          const confirmed = window.confirm("Delete this session and all timing data?");
          if (confirmed) deleteSessionMutation.mutate(sessionId);
        }}
        onArchive={handleArchiveSession}
        disableStart={initializeRaceMutation.isPending || isFinished || isArchived}
        flagLoading={flagMutation.isPending || isFinished || isArchived}
        finishing={finishSessionMutation.isPending}
        forceEnding={forceEndSessionMutation.isPending}
        archiving={archiveSessionMutation.isPending}
        isFinished={isFinished}
        isArchived={isArchived}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {isRaceSession ? (
          <RaceOrderPanel
            entries={drivers}
            onReorder={handleRaceOrderChange}
            onUpdateBestLap={handleBestLapUpdate}
            onUpdateLastLap={handleLastLapUpdate}
            onUpdateLaps={handleLapsUpdate}
            onUpdateStatus={handleStatusUpdate}
            savingOrder={updateRaceOrderMutation.isPending}
            savingLap={updateBestLapMutation.isPending}
            savingLastLap={updateLastLapMutation.isPending}
            savingLaps={updateLapsMutation.isPending}
            statusUpdating={driverStatusMutation.isPending}
            disabled={controlsLocked}
            notify={toast}
          />
        ) : (
          <DriverCaptureGrid
            drivers={driversSortedForDisplay}
            onLap={handleLap}
            onPit={(driverId) => setPitForm({ driverId })}
            onPenalty={(driverId) => setPenaltyForm((prev) => ({ ...prev, driverId }))}
            onRetire={handleRetire}
            disabled={controlsLocked}
          />
        )}

        <div className="space-y-4">
          <ControlCard title="Penalty">
            <PenaltyForm
              drivers={drivers}
              formState={penaltyForm}
              onChange={setPenaltyForm}
              notify={toast}
              submitting={logPenaltyMutation.isPending}
              disabled={controlsLocked}
              onSubmit={(payload) =>
                logPenaltyMutation.mutate({
                  sessionId,
                  driverId: payload.driverId || null,
                  reason: payload.reason,
                  seconds: payload.seconds
                })
              }
            />
          </ControlCard>

          <ControlCard title="Pit Event">
            <PitForm
              drivers={drivers}
              formState={pitForm}
              onChange={setPitForm}
              notify={toast}
              submitting={logPitEventMutation.isPending}
              disabled={controlsLocked}
              onSubmit={(payload) =>
                logPitEventMutation.mutate({
                  driverId: payload.driverId,
                  durationMs: null
                })
              }
            />
          </ControlCard>

          <ControlCard title="Lap Invalidation">
            <p className="text-sm text-white/60">
              Temporarily disabled while classification logic is being improved.
            </p>
          </ControlCard>

          <ControlCard title="Control Log">
            <ControlLog
              events={controlEventsQuery.data ?? []}
              drivers={driverMap}
              loading={controlEventsQuery.isLoading}
            />
          </ControlCard>

          {isFinished && (
            <ControlCard title="Final Classification">
              <FinalClassification
                results={resultsQuery.data}
                loading={resultsQuery.isLoading || finishSessionMutation.isPending}
              />
            </ControlCard>
          )}
        </div>
      </div>
    </div>
  );
};

const RaceControlHeader = ({
  session,
  raceClock,
  onStartRace,
  onPause,
  onResume,
  onFlag,
  onFinish,
  onForceEnd,
  onArchive,
  disableStart,
  flagLoading,
  onDelete,
  finishing,
  forceEnding,
  archiving,
  isFinished,
  isArchived
}: {
  session?: SessionState;
  raceClock: number;
  onStartRace: () => void;
  onPause: () => void;
  onResume: () => void;
  onFlag: (flag: string) => void;
  onFinish: () => void;
  onForceEnd: () => void;
  onArchive: () => void;
  disableStart?: boolean;
  flagLoading?: boolean;
  onDelete: () => void;
  finishing?: boolean;
  forceEnding?: boolean;
  archiving?: boolean;
  isFinished?: boolean;
  isArchived?: boolean;
}) => {
  const currentFlag = session?.track_status ?? "green";
  const isPaused = Boolean(session?.is_paused);
  const phase = session?.phase ?? "setup";
  const endedAt = session?.ended_at ? new Date(session.ended_at).toLocaleTimeString() : null;
  const statusLabel = session?.status ?? "draft";

  return (
    <header className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Session</p>
          <h1 className="text-3xl font-semibold text-white">{session?.name ?? "Loading"}</h1>
          <p className="text-white/60">
            {session?.track_name ?? "Track TBD"} · Target laps: {session?.laps_target ?? "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Race clock</p>
          <p className="text-3xl font-mono text-white">{formatClock(raceClock)}</p>
        </div>
      </div>
      <TrackStatusBanner status={session?.track_status} variant="control" />
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
          Phase: {phase}
        </span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
          Flag: {currentFlag}
        </span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
          Status: {statusLabel}
        </span>
        {endedAt && (
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            Ended: {endedAt}
          </span>
        )}
        {isArchived && (
          <span className="rounded-full border border-yellow-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-300">
            Archived
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
            onClick={onStartRace}
            disabled={disableStart}
          >
            Start Race
          </button>
          <button
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
            onClick={isPaused ? onResume : onPause}
            disabled={isFinished || isArchived}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          {!isFinished ? (
            <button
              className="rounded-full border border-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-40"
              onClick={onFinish}
              disabled={finishing}
            >
              {finishing ? "Finishing…" : "Finish Race"}
            </button>
          ) : (
            <span className="rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
              {isArchived ? "Archived" : "Classified"}
            </span>
          )}
          {!isFinished && (
            <button
              className="rounded-full border border-red-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-200 disabled:opacity-40"
              onClick={onForceEnd}
              disabled={forceEnding}
            >
              {forceEnding ? "Stopping…" : "Force End"}
            </button>
          )}
          {isFinished && !isArchived && (
            <button
              className="rounded-full border border-yellow-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-200 disabled:opacity-40"
              onClick={onArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving…" : "Archive Session"}
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-full border border-red-400/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-300"
            onClick={onDelete}
          >
            Delete <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {FLAG_OPTIONS.map((flag) => (
          <button
            key={flag.value}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
              currentFlag === flag.value ? flag.className : "border-white/20 text-white/70"
            }`}
            onClick={() => onFlag(flag.value)}
            disabled={flagLoading || isFinished || isArchived}
          >
            {flag.label}
          </button>
        ))}
      </div>
    </header>
  );
};

const DriverCaptureGrid = ({
  drivers,
  onLap,
  onPit,
  onPenalty,
  onRetire,
  disabled
}: {
  drivers: DriverStanding[];
  onLap: (driverId: string) => void;
  onPit: (driverId: string) => void;
  onPenalty: (driverId: string) => void;
  onRetire: (driverId: string) => void;
  disabled?: boolean;
}) => {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Hotkeys armed</p>
          <h2 className="text-xl font-semibold text-white">Driver Capture Grid</h2>
        </div>
        <p className="text-xs text-white/50">
          {disabled ? "Session ended — controls locked" : "Focus page + press key to log lap."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {drivers.map((driver, index) => (
          <DriverCard
            key={driver.driver_id}
            driver={driver}
            displayPosition={index + 1}
            hotkeyNumber={driver.car_number}
            onLap={onLap}
            onPenalty={onPenalty}
            onPit={onPit}
            onRetire={onRetire}
            disabled={disabled}
          />
        ))}
        {!drivers.length && (
          <p className="text-sm text-white/60 col-span-full">
            No drivers registered in this session yet.
          </p>
        )}
      </div>
    </section>
  );
};

const DriverCard = ({
  driver,
  displayPosition,
  hotkeyNumber,
  onLap,
  onPenalty,
  onPit,
  onRetire,
  disabled
}: {
  driver: DriverStanding;
  displayPosition: number;
  hotkeyNumber?: number;
  onLap: (driverId: string) => void;
  onPenalty: (driverId: string) => void;
  onPit: (driverId: string) => void;
  onRetire: (driverId: string) => void;
  disabled?: boolean;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="inline-flex rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">
          P{displayPosition}
        </span>
        <p className="mt-1 text-lg font-semibold text-white">
          #{driver.car_number} {driver.driver_name}
        </p>
        <p className="text-xs text-white/60">{driver.team_name}</p>
      </div>
      {hotkeyNumber !== undefined && (
        <div className="text-right text-xs text-white/70">
          <p className="rounded-full border border-white/30 px-3 py-1 font-semibold text-white/80">
            #{hotkeyNumber} • Hotkey {hotkeyNumber}
          </p>
        </div>
      )}
    </div>
    <div className="grid grid-cols-3 gap-2 text-center text-xs">
      <Stat label="Laps" value={driver.laps_completed.toString()} />
      <Stat label="Last" value={formatLapTime(driver.last_lap_ms)} />
      <Stat label="Best" value={formatLapTime(driver.best_lap_ms)} />
    </div>
    <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.3em]">
      <button
        className="rounded-full bg-brand/20 px-3 py-1 text-brand hover:bg-brand/30 disabled:opacity-30"
        onClick={() => onLap(driver.driver_id)}
        disabled={disabled}
      >
        Lap
      </button>
      <button
        className="rounded-full border border-white/30 px-3 py-1 text-white/80 hover:border-white/60 disabled:opacity-30"
        onClick={() => onPit(driver.driver_id)}
        disabled={disabled}
      >
        Pit
      </button>
      <button
        className="rounded-full border border-white/30 px-3 py-1 text-white/80 hover:border-white/60 disabled:opacity-30"
        onClick={() => onPenalty(driver.driver_id)}
        disabled={disabled}
      >
        Penalty
      </button>
      <button
        className="rounded-full border border-red-400/50 px-3 py-1 text-red-300 hover:border-red-300 disabled:opacity-30 disabled:border-white/20"
        onClick={() => onRetire(driver.driver_id)}
        disabled={disabled}
      >
        Retire
      </button>
    </div>
  </div>
);

const PenaltyForm = ({
  drivers,
  formState,
  onChange,
  notify,
  submitting,
  onSubmit,
  disabled
}: {
  drivers: DriverStanding[];
  formState: { driverId: string; seconds: string; reason: string };
  onChange: (state: { driverId: string; seconds: string; reason: string }) => void;
  notify: (options: { title: string; description?: string; variant?: "success" | "error" | "default" }) => void;
  submitting: boolean;
  onSubmit: (payload: { driverId: string; seconds: number; reason: string }) => void;
  disabled?: boolean;
}) => (
  <form
    className="space-y-3"
    onSubmit={(event) => {
      event.preventDefault();
      if (disabled) {
        notify({ variant: "error", title: "Session finished" });
        return;
      }
      const seconds = Number(formState.seconds);
      if (!formState.reason.trim()) {
        notify({ variant: "error", title: "Provide a reason" });
        return;
      }
      if (!Number.isFinite(seconds) || seconds <= 0) {
        notify({ variant: "error", title: "Penalty seconds invalid" });
        return;
      }
      onSubmit({ driverId: formState.driverId, seconds, reason: formState.reason.trim() });
    }}
  >
    <select
      className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
      value={formState.driverId}
      onChange={(event) => onChange({ ...formState, driverId: event.target.value })}
      disabled={disabled}
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
      value={formState.seconds}
      onChange={(event) => onChange({ ...formState, seconds: event.target.value })}
      disabled={disabled}
    />
    <input
      className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
      placeholder="Reason"
      value={formState.reason}
      onChange={(event) => onChange({ ...formState, reason: event.target.value })}
      disabled={disabled}
    />
    <button
      type="submit"
      className="w-full rounded-2xl bg-white/80 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
      disabled={submitting || disabled}
    >
      {submitting ? "Recording…" : "Log Penalty"}
    </button>
  </form>
);

const PitForm = ({
  drivers,
  formState,
  onChange,
  notify,
  submitting,
  onSubmit,
  disabled
}: {
  drivers: DriverStanding[];
  formState: { driverId: string };
  onChange: (state: { driverId: string }) => void;
  notify: (options: { title: string; description?: string; variant?: "success" | "error" | "default" }) => void;
  submitting: boolean;
  onSubmit: (payload: { driverId: string }) => void;
  disabled?: boolean;
}) => (
  <form
    className="space-y-3"
    onSubmit={(event) => {
      event.preventDefault();
      if (disabled) {
        notify({ variant: "error", title: "Session finished" });
        return;
      }
      if (!formState.driverId) {
        notify({ variant: "error", title: "Select a driver" });
        return;
      }
      onSubmit({ driverId: formState.driverId });
    }}
  >
    <select
      className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
      value={formState.driverId}
      onChange={(event) => onChange({ driverId: event.target.value })}
      disabled={disabled}
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
      className="w-full rounded-2xl border border-white/30 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-40"
      disabled={submitting || disabled}
    >
      {submitting ? "Logging…" : "Log Pit Event"}
    </button>
  </form>
);

const ControlLog = ({
  events,
  drivers,
  loading
}: {
  events: ControlEvent[];
  drivers: Map<string, DriverStanding>;
  loading: boolean;
}) => (
  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
    {loading && <p className="text-sm text-white/60">Loading log…</p>}
    {events.map((event) => (
      <article key={event.id} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          {new Date(event.created_at).toLocaleTimeString()}
        </p>
        <p className="font-semibold">{formatControlEvent(event, drivers)}</p>
      </article>
    ))}
    {!events.length && !loading && (
      <p className="text-sm text-white/60">No control actions yet.</p>
    )}
  </div>
);

const ControlCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
    <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
    <div className="mt-3">{children}</div>
  </div>
);

const FinalClassification = ({
  results,
  loading
}: {
  results?: TimingResult[];
  loading: boolean;
}) => {
  if (loading) {
    return <p className="text-sm text-white/60">Saving final results…</p>;
  }
  if (!results || results.length === 0) {
    return <p className="text-sm text-white/60">No classification stored yet.</p>;
  }
  return (
    <div className="space-y-2">
      {results.map((result) => (
        <article
          key={result.id}
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-2"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">P{result.position}</p>
            <p className="text-sm font-semibold text-white">
              #{result.driver?.number ?? "—"} {result.driver?.name ?? "Driver"}
            </p>
            <p className="text-xs text-white/50">{result.driver?.team_name ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{formatResultGap(result)}</p>
            <p className="text-xs text-white/60">{result.laps} laps</p>
            <p className="text-xs text-white/60">
              {result.total_time_ms ? formatLapTime(result.total_time_ms) : "—"}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white">
    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

const CreateSessionForm = ({
  formState,
  onChange,
  onSubmit,
  submitting
}: {
  formState: { name: string; trackName: string; lapsTarget: string; driversText: string };
  onChange: (state: { name: string; trackName: string; lapsTarget: string; driversText: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) => (
  <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-black/50 p-8">
    <h1 className="text-3xl font-semibold text-white">Create Session</h1>
    <p className="mt-2 text-sm text-white/60">
      Enter track details and seed drivers (one per line: Car, Driver, Team).
    </p>
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-white/60">Session Name</label>
        <input
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white"
          value={formState.name}
          onChange={(e) => onChange({ ...formState, name: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">Track</label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white"
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
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white"
            value={formState.lapsTarget}
            onChange={(e) => onChange({ ...formState, lapsTarget: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-white/60">Drivers</label>
        <textarea
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white"
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

const useRaceClock = (sessionId: string | undefined, session?: SessionState) => {
  const [time, setTime] = useState(0);
  const baselineRef = useRef<{ ms: number; ts: number }>({ ms: 0, ts: performance.now() });
  const ended = sessionHasEnded(session);

  useEffect(() => {
    const current = session?.race_time_ms ?? 0;
    baselineRef.current = { ms: current, ts: performance.now() };
    setTime(current);
  }, [session?.race_time_ms]);

  useEffect(() => {
    if (!sessionId) {
      setTime(0);
      return;
    }
    let cancelled = false;
    let interval: number | undefined;
    let frame: number | undefined;

    const syncFromServer = async () => {
      try {
        const current = await getRaceTime(sessionId);
        if (cancelled) return;
        baselineRef.current = { ms: current, ts: performance.now() };
        setTime(current);
      } catch (error) {
        console.error("Failed to sync race clock", error);
      }
    };

    syncFromServer();

    if (!ended) {
      interval = window.setInterval(syncFromServer, 1500);

      const tick = () => {
        const { ms, ts } = baselineRef.current;
        if (session?.is_paused) {
          setTime(ms);
        } else {
          setTime(ms + (performance.now() - ts));
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sessionId, session?.is_paused, ended]);

  return time;
};

const formatResultGap = (result: TimingResult) => {
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

const formatLapTime = (ms?: number | null) => {
  if (!ms || ms <= 0) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  const prefix = minutes > 0 ? `${minutes}:` : "";
  const secondsStr = minutes > 0 ? seconds.toString().padStart(2, "0") : seconds.toString();
  return `${prefix}${secondsStr}.${millis.toString().padStart(3, "0")}`;
};

const formatClock = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")];
  if (hours > 0) {
    parts.unshift(hours.toString());
  }
  return parts.join(":");
};

const formatControlEvent = (event: ControlEvent, drivers: Map<string, DriverStanding>) => {
  const driver = event.payload.driver_id ? drivers.get(event.payload.driver_id) : null;
  switch (event.type) {
    case "flag_changed":
      return `Track flag set to ${event.payload.flag}`;
    case "lap_logged":
      return `${driver ? driver.driver_name : "Driver"} lap logged (${formatLapTime(event.payload.lap_time_ms)})`;
    case "penalty_logged":
      return `${driver ? driver.driver_name : "Session"} penalty · ${event.payload.seconds}s ${event.payload.reason}`;
    case "pit_event_logged":
      return `${driver ? driver.driver_name : "Driver"} pit stop ${
        event.payload.duration_ms ? `(${(event.payload.duration_ms / 1000).toFixed(1)}s)` : ""
      }`;
    case "lap_invalidated":
      return `${driver ? driver.driver_name : "Driver"} lap invalidated`;
    case "race_paused":
      return "Race paused";
    case "race_resumed":
      return "Race resumed";
    case "race_finished":
      return "Race finished — results locked";
    case "race_force_finished":
      return `Race force-ended (${event.payload?.reason ?? "manual"})`;
    case "driver_status_changed":
      return `${driver ? driver.driver_name : "Driver"} status → ${event.payload.status}`;
    case "state_updated":
      if (event.payload?.procedure_phase) {
        return `Phase set to ${event.payload.procedure_phase}`;
      }
      return "Session state updated";
    case "control_error":
      return `Error: ${event.payload?.message ?? "Unknown"}`;
    default:
      return event.type;
  }
};

export default RaceControlPage;
