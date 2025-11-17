import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { createSession, deleteSessionDeep, fetchDriverStandings, fetchRaceEvents, fetchSessionDetail, initializeRace, invalidateLastLap, logLap, logPenalty, logPitEvent } from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useToast } from "@app/components/ToastProvider";
import { usePermissions } from "@lib/auth/usePermissions";
const HOTKEYS = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Z", "X", "C", "V", "B", "N", "M"];
const RaceControlPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { canManageRace } = usePermissions();
    const lapInputRef = useRef(null);
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
        queryFn: () => fetchSessionDetail(sessionId),
        enabled: !!sessionId
    });
    const driversQuery = useQuery({
        queryKey: ["timing-drivers", sessionId],
        queryFn: () => fetchDriverStandings(sessionId),
        enabled: !!sessionId
    });
    const eventsQuery = useQuery({
        queryKey: ["timing-events", sessionId],
        queryFn: () => fetchRaceEvents(sessionId),
        enabled: !!sessionId
    });
    const drivers = driversQuery.data ?? [];
    const refreshTimingData = () => {
        if (!sessionId)
            return;
        queryClient.invalidateQueries({ queryKey: ["timing-drivers", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["timing-events", sessionId] });
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
            setLapForm({ driverId: vars.driverId, lapMs: "" });
            refreshTimingData();
        },
        onError: (error) => toast({ variant: "error", title: "Lap logging failed", description: error.message })
    });
    const invalidateLapMutation = useMutation({
        mutationFn: (driverId) => invalidateLastLap(driverId),
        onSuccess: () => {
            toast({ variant: "success", title: "Lap invalidated" });
            refreshTimingData();
        },
        onError: (error) => toast({ variant: "error", title: "Unable to invalidate lap", description: error.message })
    });
    const logPenaltyMutation = useMutation({
        mutationFn: logPenalty,
        onSuccess: () => {
            toast({ variant: "success", title: "Penalty recorded" });
            refreshTimingData();
            setPenaltyForm((prev) => ({ ...prev, reason: "" }));
        },
        onError: (error) => toast({ variant: "error", title: "Unable to log penalty", description: error.message })
    });
    const logPitEventMutation = useMutation({
        mutationFn: logPitEvent,
        onSuccess: () => {
            toast({ variant: "success", title: "Pit event logged" });
            refreshTimingData();
            setPitForm((prev) => ({ ...prev, durationMs: "" }));
        },
        onError: (error) => toast({ variant: "error", title: "Unable to log pit event", description: error.message })
    });
    const deleteSessionMutation = useMutation({
        mutationFn: deleteSessionDeep,
        onSuccess: () => {
            toast({ variant: "success", title: "Session deleted" });
            navigate("/control");
        },
        onError: (error) => toast({ variant: "error", title: "Unable to delete session", description: error.message })
    });
    const driverById = useMemo(() => {
        const map = new Map();
        drivers.forEach((driver) => map.set(driver.driver_id, driver));
        return map;
    }, [drivers]);
    useEffect(() => {
        if (!sessionId)
            return;
        const handler = (event) => {
            if (!drivers.length)
                return;
            const target = event.target;
            if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
                return;
            const driver = driverById.get(drivers.find((d, index) => HOTKEYS[index] === event.key.toUpperCase())?.driver_id ?? "");
            if (!driver)
                return;
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
        return (_jsx(CreateSessionForm, { formState: createFormState, onChange: setCreateFormState, onSubmit: (event) => {
                event.preventDefault();
                const drivers = parseDrivers(createFormState.driversText);
                createSessionMutation.mutate({
                    name: createFormState.name,
                    trackName: createFormState.trackName,
                    lapsTarget: createFormState.lapsTarget ? Number(createFormState.lapsTarget) : undefined,
                    drivers
                });
            }, submitting: createSessionMutation.isPending }));
    }
    const session = sessionQuery.data;
    return (_jsxs("div", { className: "space-y-8", children: [_jsx(SessionHeader, { sessionId: sessionId, name: session?.name ?? "Loading", track: session?.track_name ?? "—", phase: session?.phase ?? "setup", trackStatus: session?.track_status ?? "green", lapsTarget: session?.laps_target, onStartRace: () => initializeRaceMutation.mutate(), canStartRace: canManageRace && session?.phase !== "race", onDelete: canManageRace ? () => deleteSessionMutation.mutate(sessionId) : undefined }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-[2fr,1fr]", children: [_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-5", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Drivers" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Timing Console" })] }), _jsx("p", { className: "text-xs text-white/50", children: "Hotkeys: letter lap \u00B7 Shift penalty \u00B7 Alt pit \u00B7 Ctrl invalidate" })] }), _jsxs("div", { className: "mt-4 space-y-2", children: [driversQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading drivers\u2026" })), drivers.map((driver, index) => (_jsxs("div", { className: "grid grid-cols-[1.2fr,0.6fr,0.6fr,0.6fr,1fr] items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm", children: [_jsxs("div", { className: "font-semibold text-white", children: ["#", driver.car_number, " ", driver.driver_name, _jsx("span", { className: "ml-2 text-[10px] uppercase tracking-[0.3em] text-white/50", children: HOTKEYS[index] ?? "?" })] }), _jsxs("div", { className: "text-white/70", children: ["Lap ", driver.laps_completed] }), _jsx("div", { className: "text-white/70", children: driver.last_lap_ms ? formatLap(driver.last_lap_ms) : "—" }), _jsx("div", { className: "text-white/70", children: driver.best_lap_ms ? formatLap(driver.best_lap_ms) : "—" }), _jsxs("div", { className: "flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.3em]", children: [_jsx("button", { type: "button", className: "rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50", onClick: () => setLapForm({ driverId: driver.driver_id, lapMs: "" }), children: "Lap" }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50", onClick: () => setPitForm((prev) => ({ ...prev, driverId: driver.driver_id })), children: "Pit" }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50", onClick: () => setPenaltyForm((prev) => ({ ...prev, driverId: driver.driver_id })), children: "Penalty" }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-2 py-1 text-white/70 hover:border-white/50", onClick: () => invalidateLapMutation.mutate(driver.driver_id), children: "Invalidate" })] })] }, driver.driver_id)))] })] }), _jsxs("aside", { className: "space-y-4", children: [_jsx(ControlCard, { title: "Log Lap", children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
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
                                        const nextLap = (drivers.find((d) => d.driver_id === lapForm.driverId)?.laps_completed ?? 0) + 1;
                                        logLapMutation.mutate({
                                            driverId: lapForm.driverId,
                                            lapNumber: nextLap,
                                            lapMs
                                        });
                                    }, children: [_jsxs("select", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", value: lapForm.driverId, onChange: (event) => setLapForm((prev) => ({ ...prev, driverId: event.target.value })), children: [_jsx("option", { value: "", children: "Select driver" }), drivers.map((driver) => (_jsxs("option", { value: driver.driver_id, children: ["#", driver.car_number, " ", driver.driver_name] }, driver.driver_id)))] }), _jsx("input", { ref: lapInputRef, type: "number", min: "1", className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", placeholder: "Lap time (ms)", value: lapForm.lapMs, onChange: (event) => setLapForm((prev) => ({ ...prev, lapMs: event.target.value })) }), _jsx("button", { type: "submit", className: "w-full rounded-2xl bg-brand py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: logLapMutation.isPending, children: logLapMutation.isPending ? "Logging…" : "Log Lap" })] }) }), _jsx(ControlCard, { title: "Penalty", children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                                        event.preventDefault();
                                        if (!sessionId)
                                            return;
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
                                    }, children: [_jsxs("select", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", value: penaltyForm.driverId, onChange: (event) => setPenaltyForm((prev) => ({ ...prev, driverId: event.target.value })), children: [_jsx("option", { value: "", children: "Session-level penalty" }), drivers.map((driver) => (_jsxs("option", { value: driver.driver_id, children: ["#", driver.car_number, " ", driver.driver_name] }, driver.driver_id)))] }), _jsx("input", { type: "number", min: "1", className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", placeholder: "Seconds", value: penaltyForm.seconds, onChange: (event) => setPenaltyForm((prev) => ({ ...prev, seconds: event.target.value })) }), _jsx("input", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", placeholder: "Reason", value: penaltyForm.reason, onChange: (event) => setPenaltyForm((prev) => ({ ...prev, reason: event.target.value })) }), _jsx("button", { type: "submit", className: "w-full rounded-2xl bg-white/80 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: logPenaltyMutation.isPending, children: logPenaltyMutation.isPending ? "Recording…" : "Log Penalty" })] }) }), _jsx(ControlCard, { title: "Pit Event", children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                                        event.preventDefault();
                                        if (!pitForm.driverId) {
                                            toast({ variant: "error", title: "Select a driver" });
                                            return;
                                        }
                                        const duration = pitForm.durationMs ? Number(pitForm.durationMs) : null;
                                        if (pitForm.durationMs && (!Number.isFinite(duration) || duration <= 0)) {
                                            toast({ variant: "error", title: "Invalid duration" });
                                            return;
                                        }
                                        logPitEventMutation.mutate({
                                            driverId: pitForm.driverId,
                                            durationMs: duration
                                        });
                                    }, children: [_jsxs("select", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", value: pitForm.driverId, onChange: (event) => setPitForm((prev) => ({ ...prev, driverId: event.target.value })), children: [_jsx("option", { value: "", children: "Select driver" }), drivers.map((driver) => (_jsxs("option", { value: driver.driver_id, children: ["#", driver.car_number, " ", driver.driver_name] }, driver.driver_id)))] }), _jsx("input", { type: "number", min: "0", className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", placeholder: "Duration (ms)", value: pitForm.durationMs, onChange: (event) => setPitForm((prev) => ({ ...prev, durationMs: event.target.value })) }), _jsx("button", { type: "submit", className: "w-full rounded-2xl border border-white/30 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white disabled:opacity-40", disabled: logPitEventMutation.isPending, children: logPitEventMutation.isPending ? "Logging…" : "Log Pit Event" })] }) }), _jsx(ControlCard, { title: "Invalidate Last Lap", children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                                        event.preventDefault();
                                        if (!invalidateDriverId) {
                                            toast({ variant: "error", title: "Select a driver" });
                                            return;
                                        }
                                        invalidateLapMutation.mutate(invalidateDriverId);
                                    }, children: [_jsxs("select", { className: "w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm", value: invalidateDriverId, onChange: (event) => setInvalidateDriverId(event.target.value), children: [_jsx("option", { value: "", children: "Select driver" }), drivers.map((driver) => (_jsxs("option", { value: driver.driver_id, children: ["#", driver.car_number, " ", driver.driver_name] }, driver.driver_id)))] }), _jsx("button", { type: "submit", className: "w-full rounded-2xl border border-red-400/50 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-red-300 disabled:opacity-40", disabled: invalidateLapMutation.isPending, children: invalidateLapMutation.isPending ? "Invalidating…" : "Invalidate" })] }) })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold text-white", children: "Event Log" }), eventsQuery.isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Updating\u2026" }))] }), _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-2", children: [eventsQuery.data?.map((event) => (_jsx(EventCard, { event: event, drivers: drivers }, event.id))), !eventsQuery.data?.length && !eventsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "No events recorded yet." }))] })] })] }));
};
const ControlCard = ({ title, children }) => (_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: title }), _jsx("div", { className: "mt-3", children: children })] }));
const CreateSessionForm = ({ formState, onChange, onSubmit, submitting }) => (_jsxs("div", { className: "mx-auto max-w-3xl rounded-3xl border border-white/10 bg-black/50 p-8", children: [_jsx("h1", { className: "text-3xl font-semibold", children: "Create Session" }), _jsx("p", { className: "mt-2 text-sm text-white/60", children: "Enter track details and seed drivers (one per line: Car, Driver, Team)." }), _jsxs("form", { className: "mt-6 space-y-4", onSubmit: onSubmit, children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Session Name" }), _jsx("input", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.name, onChange: (e) => onChange({ ...formState, name: e.target.value }), required: true })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Track" }), _jsx("input", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.trackName, onChange: (e) => onChange({ ...formState, trackName: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Target Laps" }), _jsx("input", { type: "number", min: 1, className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.lapsTarget, onChange: (e) => onChange({ ...formState, lapsTarget: e.target.value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Drivers" }), _jsx("textarea", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", rows: 6, placeholder: "22, Max Torque, Redwood Racing", value: formState.driversText, onChange: (e) => onChange({ ...formState, driversText: e.target.value }) })] }), _jsx("button", { type: "submit", disabled: submitting, className: "w-full rounded-2xl bg-brand py-3 text-center text-base font-semibold uppercase tracking-widest text-black disabled:opacity-40", children: submitting ? "Creating…" : "Create Session" })] })] }));
const SessionHeader = ({ sessionId, name, track, phase, trackStatus, lapsTarget, onStartRace, canStartRace, onDelete }) => (_jsx("header", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: ["Session ", sessionId] }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: name }), _jsxs("p", { className: "text-white/60", children: [track, " \u00B7 Target laps: ", lapsTarget ?? "—"] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 px-4 py-2 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Phase" }), _jsx("p", { className: "text-xl font-semibold capitalize", children: phase }), _jsxs("p", { className: "text-sm text-white/60", children: ["Track: ", trackStatus] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("button", { className: "rounded-2xl bg-brand px-5 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40", onClick: onStartRace, disabled: !canStartRace, children: "Start Race" }), onDelete && (_jsxs("button", { type: "button", className: "inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/50 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-red-300", onClick: onDelete, children: [_jsx(Trash2, { className: "h-4 w-4" }), " Delete"] }))] })] })] }) }));
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
const formatLap = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
};
const formatDurationSeconds = (ms) => {
    if (!ms || ms <= 0)
        return null;
    return `${(ms / 1000).toFixed(1)}s`;
};
const EventCard = ({ event, drivers }) => {
    const timestamp = new Date(event.created_at).toLocaleTimeString();
    const description = formatEventDescription(event, drivers);
    return (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.3em] text-white/40", children: timestamp }), _jsx("p", { className: "mt-1 font-semibold", children: event.type }), _jsx("p", { className: "text-white/70", children: description })] }));
};
const formatEventDescription = (event, drivers) => {
    if (event.type === "lap_logged") {
        const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
        return driver
            ? `${driver.driver_name} logged lap ${event.payload.lap_number} at ${formatLap(event.payload.lap_ms)}`
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
