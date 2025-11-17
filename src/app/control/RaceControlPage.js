import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSession, deleteSessionDeep, fetchControlEvents, fetchDriverStandings, fetchSessionDetail, getRaceTime, initializeRace, invalidateLastLap, logLap, logPenalty, logPitEvent, logControlError, pauseRace, resumeRace, setFlagStatus, updateDriverStatus } from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useToast } from "@app/components/ToastProvider";
import { usePermissions } from "@lib/auth/usePermissions";
const HOTKEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Z", "X", "C", "V", "B", "N", "M"];
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
    const [pitForm, setPitForm] = useState({ driverId: "", durationMs: "" });
    const [invalidateDriverId, setInvalidateDriverId] = useState("");
    const driverHotkeysRef = useRef(new Map());
    useTimingRealtime(sessionId);
    const sessionQuery = useQuery({
        queryKey: ["timing-session", sessionId],
        queryFn: () => fetchSessionDetail(sessionId),
        enabled: !!sessionId
    });
    const driversQuery = useQuery({
        queryKey: ["timing-drivers", sessionId],
        queryFn: () => fetchDriverStandings(sessionId),
        enabled: !!sessionId
    });
    const controlEventsQuery = useQuery({
        queryKey: ["control-events", sessionId],
        queryFn: () => fetchControlEvents(sessionId),
        enabled: !!sessionId
    });
    const drivers = driversQuery.data ?? [];
    const recordError = (message) => {
        if (!sessionId)
            return;
        logControlError(sessionId, message).catch(() => {
            // best effort logging
        });
    };
    const refreshTimingData = () => {
        if (!sessionId)
            return;
        queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
    };
    const createSessionMutation = useMutation({
        mutationFn: createSession,
        onSuccess: (session) => {
            toast({ variant: "success", title: "Session created" });
            navigate(`/control/${session.id}`);
        },
        onError: (error) => toast({ variant: "error", title: "Unable to create session", description: error.message })
    });
    const initializeRaceMutation = useMutation({
        mutationFn: () => initializeRace(sessionId),
        onSuccess: () => {
            toast({ variant: "success", title: "Race initialized" });
            queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
        },
        onError: (error) => toast({ variant: "error", title: "Cannot start race", description: error.message })
    });
    const logLapMutation = useMutation({
        mutationFn: logLap,
        onSuccess: (_, vars) => {
            toast({ variant: "success", title: "Lap recorded", description: `Driver ${vars.driverId}` });
            refreshTimingData();
        },
        onError: (error) => {
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
        onError: (error) => {
            recordError(error.message);
            toast({ variant: "error", title: "Unable to log penalty", description: error.message });
        }
    });
    const logPitEventMutation = useMutation({
        mutationFn: logPitEvent,
        onSuccess: () => {
            toast({ variant: "success", title: "Pit event logged" });
            refreshTimingData();
            setPitForm((prev) => ({ ...prev, durationMs: "" }));
        },
        onError: (error) => {
            recordError(error.message);
            toast({ variant: "error", title: "Unable to log pit", description: error.message });
        }
    });
    const invalidateLapMutation = useMutation({
        mutationFn: (driverId) => invalidateLastLap(driverId),
        onSuccess: () => {
            toast({ variant: "success", title: "Lap invalidated" });
            refreshTimingData();
        },
        onError: (error) => {
            recordError(error.message);
            toast({ variant: "error", title: "Unable to invalidate lap", description: error.message });
        }
    });
    const flagMutation = useMutation({
        mutationFn: ({ sessionId, flag }) => setFlagStatus(sessionId, flag),
        onSuccess: () => {
            toast({ variant: "success", title: "Track status updated" });
            queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["control-events", sessionId] });
        },
        onError: (error) => {
            recordError(error.message);
            toast({ variant: "error", title: "Unable to update track", description: error.message });
        }
    });
    const pauseMutation = useMutation({
        mutationFn: (action) => action === "pause" ? pauseRace(sessionId) : resumeRace(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timing-session", sessionId] });
            toast({ variant: "success", title: "Timer updated" });
        },
        onError: (error) => {
            recordError(error.message);
            toast({ variant: "error", title: "Unable to update timer", description: error.message });
        }
    });
    const driverStatusMutation = useMutation({
        mutationFn: ({ driverId, status }) => updateDriverStatus(driverId, status),
        onSuccess: () => {
            refreshTimingData();
            toast({ variant: "success", title: "Driver updated" });
        },
        onError: (error) => {
            recordError(error.message);
            toast({ variant: "error", title: "Unable to update driver", description: error.message });
        }
    });
    const deleteSessionMutation = useMutation({
        mutationFn: deleteSessionDeep,
        onSuccess: () => {
            toast({ variant: "success", title: "Session deleted" });
            navigate("/control");
        },
        onError: (error) => toast({ variant: "error", title: "Unable to delete session", description: error.message })
    });
    const driverMap = useMemo(() => {
        const map = new Map();
        drivers.forEach((driver) => map.set(driver.driver_id, driver));
        return map;
    }, [drivers]);
    useEffect(() => {
        const mapping = new Map();
        drivers.forEach((driver, index) => {
            const key = HOTKEYS[index];
            if (key)
                mapping.set(key, driver.driver_id);
        });
        driverHotkeysRef.current = mapping;
    }, [drivers]);
    useEffect(() => {
        if (!sessionId)
            return;
        const handler = (event) => {
            const active = document.activeElement;
            if (active &&
                ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) {
                return;
            }
            const driverId = driverHotkeysRef.current.get(event.key.toUpperCase());
            if (!driverId)
                return;
            event.preventDefault();
            logLapMutation.mutate({ driverId });
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [logLapMutation, sessionId]);
    if (!sessionId) {
        return (_jsx(CreateSessionForm, { formState: createFormState, onChange: setCreateFormState, onSubmit: (event) => {
                event.preventDefault();
                const driversInput = parseDrivers(createFormState.driversText);
                createSessionMutation.mutate({
                    name: createFormState.name,
                    trackName: createFormState.trackName,
                    lapsTarget: createFormState.lapsTarget ? Number(createFormState.lapsTarget) : undefined,
                    drivers: driversInput
                });
            }, submitting: createSessionMutation.isPending }));
    }
    if (!canManageRace) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "You need race control permissions to access this console." }));
    }
    const session = sessionQuery.data;
    const raceClock = useRaceClock(sessionId, session);
    return (_jsxs("div", { className: "space-y-8", children: [_jsx(RaceControlHeader, { session: session, raceClock: raceClock, onStartRace: () => initializeRaceMutation.mutate(), onPause: () => pauseMutation.mutate("pause"), onResume: () => pauseMutation.mutate("resume"), onFlag: (flag) => flagMutation.mutate({ sessionId, flag }), onDelete: () => {
                    const confirmed = window.confirm("Delete this session and all timing data?");
                    if (confirmed)
                        deleteSessionMutation.mutate(sessionId);
                }, disableStart: initializeRaceMutation.isPending, flagLoading: flagMutation.isPending }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[2fr,1fr]", children: [_jsx(DriverCaptureGrid, { drivers: drivers, driverMap: driverMap, hotkeysRef: driverHotkeysRef.current, onLap: (driverId) => logLapMutation.mutate({ driverId }), onPit: (driverId) => setPitForm((prev) => ({ ...prev, driverId })), onPenalty: (driverId) => setPenaltyForm((prev) => ({ ...prev, driverId })), onInvalidate: (driverId) => invalidateLapMutation.mutate(driverId), onRetire: (driverId) => driverStatusMutation.mutate({ driverId, status: "retired" }) }), _jsxs("div", { className: "space-y-4", children: [_jsx(ControlCard, { title: "Penalty", children: _jsx(PenaltyForm, { drivers: drivers, formState: penaltyForm, onChange: setPenaltyForm, notify: toast, submitting: logPenaltyMutation.isPending, onSubmit: (payload) => logPenaltyMutation.mutate({
                                        sessionId,
                                        driverId: payload.driverId || null,
                                        reason: payload.reason,
                                        seconds: payload.seconds
                                    }) }) }), _jsx(ControlCard, { title: "Pit Event", children: _jsx(PitForm, { drivers: drivers, formState: pitForm, onChange: setPitForm, notify: toast, submitting: logPitEventMutation.isPending, onSubmit: (payload) => logPitEventMutation.mutate(payload) }) }), _jsx(ControlCard, { title: "Invalidate Last Lap", children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                                        event.preventDefault();
                                        if (!invalidateDriverId) {
                                            toast({ variant: "error", title: "Select a driver" });
                                            return;
                                        }
                                        invalidateLapMutation.mutate(invalidateDriverId);
                                    }, children: [_jsxs("select", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", value: invalidateDriverId, onChange: (event) => setInvalidateDriverId(event.target.value), children: [_jsx("option", { value: "", children: "Select driver" }), drivers.map((driver) => (_jsxs("option", { value: driver.driver_id, children: ["#", driver.car_number, " ", driver.driver_name] }, driver.driver_id)))] }), _jsx("button", { type: "submit", className: "w-full rounded-2xl border border-red-400/50 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-red-300 disabled:opacity-40", disabled: invalidateLapMutation.isPending, children: invalidateLapMutation.isPending ? "Invalidating…" : "Invalidate Lap" })] }) }), _jsx(ControlCard, { title: "Control Log", children: _jsx(ControlLog, { events: controlEventsQuery.data ?? [], drivers: driverMap, loading: controlEventsQuery.isLoading }) })] })] })] }));
};
const RaceControlHeader = ({ session, raceClock, onStartRace, onPause, onResume, onFlag, disableStart, flagLoading, onDelete }) => {
    const currentFlag = session?.track_status ?? "green";
    const isPaused = Boolean(session?.is_paused);
    const phase = session?.phase ?? "setup";
    return (_jsxs("header", { className: "rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Session" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: session?.name ?? "Loading" }), _jsxs("p", { className: "text-white/60", children: [session?.track_name ?? "Track TBD", " \u00B7 Target laps: ", session?.laps_target ?? "—"] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Race clock" }), _jsx("p", { className: "text-3xl font-mono text-white", children: formatClock(raceClock) })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("span", { className: "rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60", children: ["Phase: ", phase] }), _jsxs("span", { className: "rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60", children: ["Flag: ", currentFlag] }), _jsxs("div", { className: "ml-auto flex flex-wrap gap-2", children: [_jsx("button", { className: "rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", onClick: onStartRace, disabled: disableStart, children: "Start Race" }), _jsx("button", { className: "rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white", onClick: isPaused ? onResume : onPause, children: isPaused ? "Resume" : "Pause" }), _jsxs("button", { className: "inline-flex items-center gap-2 rounded-full border border-red-400/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-300", onClick: onDelete, children: ["Delete ", _jsx(Trash2, { className: "h-3 w-3" })] })] })] }), _jsx("div", { className: "flex flex-wrap gap-3", children: FLAG_OPTIONS.map((flag) => (_jsx("button", { className: `rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${currentFlag === flag.value ? flag.className : "border-white/20 text-white/70"}`, onClick: () => onFlag(flag.value), disabled: flagLoading, children: flag.label }, flag.value))) })] }));
};
const DriverCaptureGrid = ({ drivers, driverMap, hotkeysRef, onLap, onPit, onPenalty, onInvalidate, onRetire }) => {
    const keyMap = new Map();
    Array.from(hotkeysRef.entries()).forEach(([key, driverId]) => keyMap.set(driverId, key));
    return (_jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Hotkeys armed" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Driver Capture Grid" })] }), _jsx("p", { className: "text-xs text-white/50", children: "Focus page + press key to log lap." })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children: [drivers.map((driver) => (_jsx(DriverCard, { driver: driver, hotkey: keyMap.get(driver.driver_id), onLap: onLap, onPenalty: onPenalty, onPit: onPit, onInvalidate: onInvalidate, onRetire: onRetire }, driver.driver_id))), !drivers.length && (_jsx("p", { className: "text-sm text-white/60 col-span-full", children: "No drivers registered in this session yet." }))] })] }));
};
const DriverCard = ({ driver, hotkey, onLap, onPenalty, onPit, onInvalidate, onRetire }) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-lg font-semibold text-white", children: ["#", driver.car_number, " ", driver.driver_name] }), _jsx("p", { className: "text-xs text-white/60", children: driver.team_name })] }), hotkey && (_jsx("span", { className: "rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white/80", children: hotkey }))] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 text-center text-xs", children: [_jsx(Stat, { label: "Laps", value: driver.laps_completed.toString() }), _jsx(Stat, { label: "Last", value: formatLapTime(driver.last_lap_ms) }), _jsx(Stat, { label: "Best", value: formatLapTime(driver.best_lap_ms) })] }), _jsxs("div", { className: "flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.3em]", children: [_jsx("button", { className: "rounded-full bg-brand/20 px-3 py-1 text-brand hover:bg-brand/30", onClick: () => onLap(driver.driver_id), children: "Lap" }), _jsx("button", { className: "rounded-full border border-white/30 px-3 py-1 text-white/80 hover:border-white/60", onClick: () => onPit(driver.driver_id), children: "Pit" }), _jsx("button", { className: "rounded-full border border-white/30 px-3 py-1 text-white/80 hover:border-white/60", onClick: () => onPenalty(driver.driver_id), children: "Penalty" }), _jsx("button", { className: "rounded-full border border-white/30 px-3 py-1 text-white/80 hover:border-white/60", onClick: () => onInvalidate(driver.driver_id), children: "Invalidate" }), _jsx("button", { className: "rounded-full border border-red-400/50 px-3 py-1 text-red-300 hover:border-red-300", onClick: () => onRetire(driver.driver_id), children: "Retire" })] })] }));
const PenaltyForm = ({ drivers, formState, onChange, notify, submitting, onSubmit }) => (_jsxs("form", { className: "space-y-3", onSubmit: (event) => {
        event.preventDefault();
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
    }, children: [_jsxs("select", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", value: formState.driverId, onChange: (event) => onChange({ ...formState, driverId: event.target.value }), children: [_jsx("option", { value: "", children: "Session-level penalty" }), drivers.map((driver) => (_jsxs("option", { value: driver.driver_id, children: ["#", driver.car_number, " ", driver.driver_name] }, driver.driver_id)))] }), _jsx("input", { type: "number", min: "1", className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", placeholder: "Seconds", value: formState.seconds, onChange: (event) => onChange({ ...formState, seconds: event.target.value }) }), _jsx("input", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", placeholder: "Reason", value: formState.reason, onChange: (event) => onChange({ ...formState, reason: event.target.value }) }), _jsx("button", { type: "submit", className: "w-full rounded-2xl bg-white/80 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: submitting, children: submitting ? "Recording…" : "Log Penalty" })] }));
const PitForm = ({ drivers, formState, onChange, notify, submitting, onSubmit }) => (_jsxs("form", { className: "space-y-3", onSubmit: (event) => {
        event.preventDefault();
        if (!formState.driverId)
            return;
        const duration = formState.durationMs ? Number(formState.durationMs) : null;
        if (formState.durationMs && (!Number.isFinite(duration) || duration <= 0)) {
            notify({ variant: "error", title: "Invalid duration" });
            return;
        }
        onSubmit({ driverId: formState.driverId, durationMs: duration });
    }, children: [_jsxs("select", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", value: formState.driverId, onChange: (event) => onChange({ ...formState, driverId: event.target.value }), children: [_jsx("option", { value: "", children: "Select driver" }), drivers.map((driver) => (_jsxs("option", { value: driver.driver_id, children: ["#", driver.car_number, " ", driver.driver_name] }, driver.driver_id)))] }), _jsx("input", { type: "number", min: "0", className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", placeholder: "Duration (ms)", value: formState.durationMs, onChange: (event) => onChange({ ...formState, durationMs: event.target.value }) }), _jsx("button", { type: "submit", className: "w-full rounded-2xl border border-white/30 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-40", disabled: submitting, children: submitting ? "Logging…" : "Log Pit Event" })] }));
const ControlLog = ({ events, drivers, loading }) => (_jsxs("div", { className: "max-h-[420px] space-y-3 overflow-y-auto pr-1", children: [loading && _jsx("p", { className: "text-sm text-white/60", children: "Loading log\u2026" }), events.map((event) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.3em] text-white/40", children: new Date(event.created_at).toLocaleTimeString() }), _jsx("p", { className: "font-semibold", children: formatControlEvent(event, drivers) })] }, event.id))), !events.length && !loading && (_jsx("p", { className: "text-sm text-white/60", children: "No control actions yet." }))] }));
const ControlCard = ({ title, children }) => (_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: title }), _jsx("div", { className: "mt-3", children: children })] }));
const Stat = ({ label, value }) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white", children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.3em] text-white/40", children: label }), _jsx("p", { className: "text-sm font-semibold", children: value })] }));
const CreateSessionForm = ({ formState, onChange, onSubmit, submitting }) => (_jsxs("div", { className: "mx-auto max-w-3xl rounded-3xl border border-white/10 bg-black/50 p-8", children: [_jsx("h1", { className: "text-3xl font-semibold text-white", children: "Create Session" }), _jsx("p", { className: "mt-2 text-sm text-white/60", children: "Enter track details and seed drivers (one per line: Car, Driver, Team)." }), _jsxs("form", { className: "mt-6 space-y-4", onSubmit: onSubmit, children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Session Name" }), _jsx("input", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white", value: formState.name, onChange: (e) => onChange({ ...formState, name: e.target.value }), required: true })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Track" }), _jsx("input", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white", value: formState.trackName, onChange: (e) => onChange({ ...formState, trackName: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Target Laps" }), _jsx("input", { type: "number", min: 1, className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white", value: formState.lapsTarget, onChange: (e) => onChange({ ...formState, lapsTarget: e.target.value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Drivers" }), _jsx("textarea", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white", rows: 6, placeholder: "22, Max Torque, Redwood Racing", value: formState.driversText, onChange: (e) => onChange({ ...formState, driversText: e.target.value }) })] }), _jsx("button", { type: "submit", disabled: submitting, className: "w-full rounded-2xl bg-brand py-3 text-center text-base font-semibold uppercase tracking-widest text-black disabled:opacity-40", children: submitting ? "Creating…" : "Create Session" })] })] }));
const parseDrivers = (input) => input
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
const useRaceClock = (sessionId, session) => {
    const [time, setTime] = useState(0);
    const baselineRef = useRef({ ms: 0, ts: performance.now() });
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
        const syncFromServer = async () => {
            try {
                const current = await getRaceTime(sessionId);
                if (cancelled)
                    return;
                baselineRef.current = { ms: current, ts: performance.now() };
                setTime(current);
            }
            catch (error) {
                console.error("Failed to sync race clock", error);
            }
        };
        syncFromServer();
        const interval = window.setInterval(syncFromServer, 1500);
        let frame;
        const tick = () => {
            const { ms, ts } = baselineRef.current;
            if (session?.is_paused) {
                setTime(ms);
            }
            else {
                setTime(ms + (performance.now() - ts));
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            clearInterval(interval);
            cancelAnimationFrame(frame);
        };
    }, [sessionId, session?.is_paused, session?.phase]);
    return time;
};
const formatLapTime = (ms) => {
    if (!ms || ms <= 0)
        return "—";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor(ms % 1000);
    const prefix = minutes > 0 ? `${minutes}:` : "";
    const secondsStr = minutes > 0 ? seconds.toString().padStart(2, "0") : seconds.toString();
    return `${prefix}${secondsStr}.${millis.toString().padStart(3, "0")}`;
};
const formatClock = (ms) => {
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
const formatControlEvent = (event, drivers) => {
    const driver = event.payload.driver_id ? drivers.get(event.payload.driver_id) : null;
    switch (event.type) {
        case "flag_changed":
            return `Track flag set to ${event.payload.flag}`;
        case "lap_logged":
            return `${driver ? driver.driver_name : "Driver"} lap logged (${formatLapTime(event.payload.lap_time_ms)})`;
        case "penalty_logged":
            return `${driver ? driver.driver_name : "Session"} penalty · ${event.payload.seconds}s ${event.payload.reason}`;
        case "pit_event_logged":
            return `${driver ? driver.driver_name : "Driver"} pit stop ${event.payload.duration_ms ? `(${(event.payload.duration_ms / 1000).toFixed(1)}s)` : ""}`;
        case "lap_invalidated":
            return `${driver ? driver.driver_name : "Driver"} lap invalidated`;
        case "race_paused":
            return "Race paused";
        case "race_resumed":
            return "Race resumed";
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
