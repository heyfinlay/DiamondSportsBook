import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteSessionDeep,
  fetchSessions,
  finishSession,
  initializeRace,
  archiveSession,
  restoreSession,
  setActiveSession,
  type TimingSessionSummary
} from "@domains/timing/api/timingApi";
import { usePermissions } from "@lib/auth/usePermissions";

const TimingSessionsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canManageRace } = usePermissions();

  const sessionsQuery = useQuery({
    queryKey: ["timing-sessions"],
    queryFn: fetchSessions,
    enabled: canManageRace
  });

  const startMutation = useMutation({
    mutationFn: (sessionId: string) => initializeRace(sessionId),
    onSuccess: () => {
      toast.success("Session started");
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
    },
    onError: (error: Error) =>
      toast.error("Unable to start session", { description: error.message })
  });

  const finishMutation = useMutation({
    mutationFn: (sessionId: string) => finishSession(sessionId),
    onSuccess: () => {
      toast.success("Race finished", { description: "Classification saved." });
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
    },
    onError: (error: Error) =>
      toast.error("Unable to finish session", { description: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSessionDeep(sessionId),
    onSuccess: () => {
      toast.success("Session deleted");
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
    },
    onError: (error: Error) => {
      // Check if error message indicates we should archive instead
      const shouldArchive = error.message.includes("Archive") || error.message.includes("archive");
      toast.error("Unable to delete session", {
        description: shouldArchive
          ? "This session has events or timing data and cannot be deleted. Use the Archive button instead to hide it from Live Markets while preserving all data."
          : error.message
      });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (sessionId: string) => archiveSession(sessionId),
    onSuccess: () => {
      toast.success("Session archived", {
        description: "The session and its markets will no longer appear on Live Markets."
      });
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
    },
    onError: (error: Error) =>
      toast.error("Unable to archive session", { description: error.message })
  });

  const restoreMutation = useMutation({
    mutationFn: (sessionId: string) => restoreSession(sessionId),
    onSuccess: () => {
      toast.success("Session restored", {
        description: "The session and its markets are now visible on Live Markets again."
      });
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
    },
    onError: (error: Error) =>
      toast.error("Unable to restore session", { description: error.message })
  });

  if (!canManageRace) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Race control permissions are required to manage timing sessions.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Race Control</p>
          <h1 className="text-3xl font-semibold text-white">Timing Sessions</h1>
          <p className="text-sm text-white/60">
            Launch, finish, or clean up timing sessions. Actions require race_control permissions.
          </p>
        </div>
        <Link
          to="/admin/session-setup"
          className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:bg-brand/90"
        >
          + New Session
        </Link>
      </header>

      <section className="rounded-3xl border border-white/10 bg-black/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-white">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-white/50">
              <tr>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Phase</th>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">Live</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessionsQuery.data?.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onOpen={() => navigate(`/control/${session.id}`)}
                  onStart={() => startMutation.mutate(session.id)}
                  onFinish={() => finishMutation.mutate(session.id)}
                  onDelete={() => {
                    const confirmed = window.confirm(
                      "Delete this session? This only works for empty sessions with no events or timing data."
                    );
                    if (confirmed) deleteMutation.mutate(session.id);
                  }}
                  onArchive={() => {
                    const confirmed = window.confirm(
                      "Archive this session? It will no longer appear on Live Markets, but all data will be preserved and you can restore it later."
                    );
                    if (confirmed) archiveMutation.mutate(session.id);
                  }}
                  onRestore={() => restoreMutation.mutate(session.id)}
                  finishing={finishMutation.isPending}
                  starting={startMutation.isPending}
                  deleting={deleteMutation.isPending}
                  archiving={archiveMutation.isPending}
                  restoring={restoreMutation.isPending}
                  onSetLive={() => setLiveMutation.mutate(session.id)}
                  settingLive={setLiveMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
        {sessionsQuery.isLoading && (
          <p className="px-4 py-3 text-sm text-white/60">Loading sessions…</p>
        )}
        {sessionsQuery.data && sessionsQuery.data.length === 0 && !sessionsQuery.isLoading && (
          <p className="px-4 py-3 text-sm text-white/60">No sessions found.</p>
        )}
      </section>
    </div>
  );
};

const SessionRow = ({
  session,
  onOpen,
  onStart,
  onFinish,
  onDelete,
  onArchive,
  onRestore,
  onSetLive,
  starting,
  finishing,
  deleting,
  archiving,
  restoring,
  settingLive
}: {
  session: TimingSessionSummary;
  onOpen: () => void;
  onStart: () => void;
  onFinish: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onSetLive: () => void;
  starting: boolean;
  finishing: boolean;
  deleting: boolean;
  archiving: boolean;
  restoring: boolean;
  settingLive: boolean;
}) => {
  const phase = session.session_state?.procedure_phase ?? "setup";
  const flag = session.session_state?.flag_status ?? "green";
  const isFinished = session.status === "finished" || session.status === "completed" || phase === "finished";
  const isArchived = session.archived_at != null;
  const isLive = Boolean(session.is_active);

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3">
        <p className="font-semibold">{session.name}</p>
        <p className="text-xs text-white/50">{session.track_name ?? "Track TBD"}</p>
      </td>
      <td className="px-4 py-3 capitalize">{session.mode ?? "race"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70">
            {session.status}
          </span>
          {isArchived && (
            <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-yellow-300">
              Archived
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-white/80">
        {phase}
        <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/60">
          {flag}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-white/60">
          Starts {session.starts_at ? new Date(session.starts_at).toLocaleString() : "TBD"}
        </p>
      </td>
      <td className="px-4 py-3">
        {isLive ? (
          <span className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Live
          </span>
        ) : (
          !isArchived && (
            <button
              className="rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white hover:border-white/60 disabled:opacity-40"
              onClick={onSetLive}
              disabled={settingLive}
            >
              {settingLive ? "Setting…" : "Set as live"}
            </button>
          )
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="rounded-full border border-white/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white hover:border-white/60"
            onClick={onOpen}
          >
            Open
          </button>
          {!isFinished && !isArchived && (
            <button
              className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              onClick={onStart}
              disabled={starting}
            >
              {starting ? "Starting…" : "Start"}
            </button>
          )}
          {!isFinished && !isArchived && (
            <button
              className="rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-40"
              onClick={() => {
                const confirmed = window.confirm("Finish this session and lock the results?");
                if (confirmed) onFinish();
              }}
              disabled={finishing}
            >
              {finishing ? "Finishing…" : "Finish"}
            </button>
          )}
          {isFinished && !isArchived && (
            <button
              className="rounded-full border border-yellow-400/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-300 disabled:opacity-40 hover:bg-yellow-400/10"
              onClick={onArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving…" : "Archive"}
            </button>
          )}
          {isArchived && (
            <button
              className="rounded-full border border-green-400/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-green-300 disabled:opacity-40 hover:bg-green-400/10"
              onClick={onRestore}
              disabled={restoring}
            >
              {restoring ? "Restoring…" : "Restore"}
            </button>
          )}
          <button
            className="rounded-full border border-red-400/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-red-300 disabled:opacity-40"
            onClick={onDelete}
            disabled={deleting}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TimingSessionsPage;
  const setLiveMutation = useMutation({
    mutationFn: (sessionId: string) => setActiveSession(sessionId),
    onSuccess: () => {
      toast.success("Session marked live");
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
    },
    onError: (error: Error) =>
      toast.error("Unable to set live session", { description: error.message })
  });
