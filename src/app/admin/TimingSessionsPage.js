import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSessionDeep, fetchSessions, finishSession, initializeRace, archiveSession, restoreSession } from "@domains/timing/api/timingApi";
import { useToast } from "@app/components/ToastProvider";
import { usePermissions } from "@lib/auth/usePermissions";
const TimingSessionsPage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { canManageRace } = usePermissions();
    const sessionsQuery = useQuery({
        queryKey: ["timing-sessions"],
        queryFn: fetchSessions,
        enabled: canManageRace
    });
    const startMutation = useMutation({
        mutationFn: (sessionId) => initializeRace(sessionId),
        onSuccess: () => {
            toast({ variant: "success", title: "Session started" });
            queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
        },
        onError: (error) => toast({
            variant: "error",
            title: "Unable to start session",
            description: error.message
        })
    });
    const finishMutation = useMutation({
        mutationFn: (sessionId) => finishSession(sessionId),
        onSuccess: () => {
            toast({ variant: "success", title: "Race finished", description: "Classification saved." });
            queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
        },
        onError: (error) => toast({
            variant: "error",
            title: "Unable to finish session",
            description: error.message
        })
    });
    const deleteMutation = useMutation({
        mutationFn: (sessionId) => deleteSessionDeep(sessionId),
        onSuccess: () => {
            toast({ variant: "success", title: "Session deleted" });
            queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
        },
        onError: (error) => {
            // Check if error message indicates we should archive instead
            const shouldArchive = error.message.includes("Archive") || error.message.includes("archive");
            toast({
                variant: "error",
                title: "Unable to delete session",
                description: shouldArchive
                    ? "This session has events or timing data and cannot be deleted. Use the Archive button instead to hide it from Live Markets while preserving all data."
                    : error.message
            });
        }
    });
    const archiveMutation = useMutation({
        mutationFn: (sessionId) => archiveSession(sessionId),
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Session archived",
                description: "The session and its markets will no longer appear on Live Markets."
            });
            queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
        },
        onError: (error) => toast({
            variant: "error",
            title: "Unable to archive session",
            description: error.message
        })
    });
    const restoreMutation = useMutation({
        mutationFn: (sessionId) => restoreSession(sessionId),
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Session restored",
                description: "The session and its markets are now visible on Live Markets again."
            });
            queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
        },
        onError: (error) => toast({
            variant: "error",
            title: "Unable to restore session",
            description: error.message
        })
    });
    if (!canManageRace) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Race control permissions are required to manage timing sessions." }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Race Control" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: "Timing Sessions" }), _jsx("p", { className: "text-sm text-white/60", children: "Launch, finish, or clean up timing sessions. Actions require race_control permissions." })] }), _jsx(Link, { to: "/admin/session-setup", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:bg-brand/90", children: "+ New Session" })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full border-collapse text-sm text-white", children: [_jsx("thead", { className: "bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-white/50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: "Session" }), _jsx("th", { className: "px-4 py-3", children: "Mode" }), _jsx("th", { className: "px-4 py-3", children: "Status" }), _jsx("th", { className: "px-4 py-3", children: "Phase" }), _jsx("th", { className: "px-4 py-3", children: "Track" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Actions" })] }) }), _jsx("tbody", { children: sessionsQuery.data?.map((session) => (_jsx(SessionRow, { session: session, onOpen: () => navigate(`/control/${session.id}`), onStart: () => startMutation.mutate(session.id), onFinish: () => finishMutation.mutate(session.id), onDelete: () => {
                                            const confirmed = window.confirm("Delete this session? This only works for empty sessions with no events or timing data.");
                                            if (confirmed)
                                                deleteMutation.mutate(session.id);
                                        }, onArchive: () => {
                                            const confirmed = window.confirm("Archive this session? It will no longer appear on Live Markets, but all data will be preserved and you can restore it later.");
                                            if (confirmed)
                                                archiveMutation.mutate(session.id);
                                        }, onRestore: () => restoreMutation.mutate(session.id), finishing: finishMutation.isPending, starting: startMutation.isPending, deleting: deleteMutation.isPending, archiving: archiveMutation.isPending, restoring: restoreMutation.isPending }, session.id))) })] }) }), sessionsQuery.isLoading && (_jsx("p", { className: "px-4 py-3 text-sm text-white/60", children: "Loading sessions\u2026" })), sessionsQuery.data && sessionsQuery.data.length === 0 && !sessionsQuery.isLoading && (_jsx("p", { className: "px-4 py-3 text-sm text-white/60", children: "No sessions found." }))] })] }));
};
const SessionRow = ({ session, onOpen, onStart, onFinish, onDelete, onArchive, onRestore, starting, finishing, deleting, archiving, restoring }) => {
    const phase = session.session_state?.procedure_phase ?? "setup";
    const flag = session.session_state?.flag_status ?? "green";
    const isFinished = session.status === "finished" || session.status === "completed" || phase === "finished";
    const isArchived = session.archived_at != null;
    return (_jsxs("tr", { className: "border-t border-white/10", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("p", { className: "font-semibold", children: session.name }), _jsx("p", { className: "text-xs text-white/50", children: session.track_name ?? "Track TBD" })] }), _jsx("td", { className: "px-4 py-3 capitalize", children: session.mode ?? "race" }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70", children: session.status }), isArchived && (_jsx("span", { className: "rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-yellow-300", children: "Archived" }))] }) }), _jsxs("td", { className: "px-4 py-3 text-sm text-white/80", children: [phase, _jsx("span", { className: "ml-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/60", children: flag })] }), _jsx("td", { className: "px-4 py-3", children: _jsxs("p", { className: "text-xs text-white/60", children: ["Starts ", session.starts_at ? new Date(session.starts_at).toLocaleString() : "TBD"] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex flex-wrap justify-end gap-2", children: [_jsx("button", { className: "rounded-full border border-white/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white hover:border-white/60", onClick: onOpen, children: "Open" }), !isFinished && !isArchived && (_jsx("button", { className: "rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", onClick: onStart, disabled: starting, children: starting ? "Starting…" : "Start" })), !isFinished && !isArchived && (_jsx("button", { className: "rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-40", onClick: () => {
                                const confirmed = window.confirm("Finish this session and lock the results?");
                                if (confirmed)
                                    onFinish();
                            }, disabled: finishing, children: finishing ? "Finishing…" : "Finish" })), isFinished && !isArchived && (_jsx("button", { className: "rounded-full border border-yellow-400/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-300 disabled:opacity-40 hover:bg-yellow-400/10", onClick: onArchive, disabled: archiving, children: archiving ? "Archiving…" : "Archive" })), isArchived && (_jsx("button", { className: "rounded-full border border-green-400/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-green-300 disabled:opacity-40 hover:bg-green-400/10", onClick: onRestore, disabled: restoring, children: restoring ? "Restoring…" : "Restore" })), _jsx("button", { className: "rounded-full border border-red-400/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-red-300 disabled:opacity-40", onClick: onDelete, disabled: deleting, children: "Delete" })] }) })] }));
};
export default TimingSessionsPage;
