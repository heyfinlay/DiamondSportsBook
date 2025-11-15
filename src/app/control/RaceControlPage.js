import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createSession, fetchDriverStandings, fetchSessionDetail, fetchRaceEvents, initializeRace, logLap } from "@domains/timing/api/timingApi";
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
    const [lapError, setLapError] = useState(null);
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
    const createSessionMutation = useMutation({
        mutationFn: createSession,
        onSuccess: (session) => {
            navigate(`/control/${session.id}`);
        }
    });
    const initializeRaceMutation = useMutation({
        mutationFn: () => initializeRace(sessionId),
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
        onError: (error) => {
            setLapError(error.message);
        }
    });
    const handleCreateSession = (event) => {
        event.preventDefault();
        const drivers = parseDrivers(formState.driversText);
        createSessionMutation.mutate({
            name: formState.name,
            trackName: formState.trackName,
            lapsTarget: formState.lapsTarget ? Number(formState.lapsTarget) : undefined,
            drivers
        });
    };
    const handleLogLap = (driver) => {
        const nextLap = driver.laps_completed + 1;
        const lapInput = window.prompt(`Lap ${nextLap} time (ms) for ${driver.driver_name}`, "90000");
        if (!lapInput)
            return;
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
    if (!sessionId) {
        return (_jsx(CreateSessionForm, { formState: formState, onChange: setFormState, onSubmit: handleCreateSession, submitting: createSessionMutation.isPending }));
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsx(SessionHeader, { sessionId: sessionId, name: sessionQuery.data?.name ?? "Loading", track: sessionQuery.data?.track_name ?? "—", phase: sessionQuery.data?.phase ?? "setup", trackStatus: sessionQuery.data?.track_status ?? "green", lapsTarget: sessionQuery.data?.laps_target ?? undefined, onStartRace: () => initializeRaceMutation.mutate(), canStartRace: sessionQuery.data?.phase !== "race" }), _jsxs("section", { className: "grid gap-8 lg:grid-cols-[2fr,1fr]", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Drivers" }), _jsx("p", { className: "text-sm text-white/60", children: "Click \u201CLog Lap\u201D to record manual times." })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-4 py-2", children: ["Session: ", sessionId] })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-4", children: [_jsxs("div", { className: "grid grid-cols-6 gap-3 text-xs uppercase tracking-wider text-white/60", children: [_jsx("span", { children: "Driver" }), _jsx("span", { children: "Lap" }), _jsx("span", { children: "Last" }), _jsx("span", { children: "Best" }), _jsx("span", { children: "Status" }), _jsx("span", { children: "Hotkey / Actions" })] }), _jsxs("div", { className: "mt-3 space-y-2", children: [driversQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading drivers\u2026" })), lapError && (_jsx("p", { className: "text-sm font-semibold text-red-400", children: lapError })), driversQuery.data?.map((driver) => (_jsxs("div", { className: "grid grid-cols-6 items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-sm", children: [_jsxs("div", { className: "font-semibold", children: ["#", driver.car_number, " ", driver.driver_name] }), _jsx("div", { children: driver.laps_completed }), _jsx("div", { children: driver.last_lap_ms ? formatLap(driver.last_lap_ms) : "—" }), _jsx("div", { children: driver.best_lap_ms ? formatLap(driver.best_lap_ms) : "—" }), _jsx("div", { className: "capitalize", children: driver.status }), _jsxs("div", { children: [_jsxs("p", { className: "text-[11px] uppercase tracking-[0.3em] text-white/40", children: ["Hotkey: ", getHotkeyLabel(driver)] }), _jsx("button", { className: "rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand", onClick: () => handleLogLap(driver), children: "Log Lap" })] })] }, driver.driver_id)))] })] })] }), _jsxs("aside", { className: "space-y-4 rounded-3xl border border-white/10 bg-black/40 p-4", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Event Feed" }), eventsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading events\u2026" })), _jsxs("div", { className: "max-h-[420px] space-y-3 overflow-y-auto", children: [eventsQuery.data?.map((event) => (_jsx(EventCard, { event: event, drivers: driversQuery.data ?? [] }, event.id))), eventsQuery.data && eventsQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No events logged yet." }))] })] })] })] }));
};
const CreateSessionForm = ({ formState, onChange, onSubmit, submitting }) => {
    return (_jsxs("div", { className: "max-w-3xl rounded-3xl border border-white/10 bg-black/50 p-8", children: [_jsx("h1", { className: "text-3xl font-semibold", children: "Create Session" }), _jsx("p", { className: "mt-2 text-sm text-white/60", children: "Enter track details and seed drivers (one per line: Car, Driver, Team)." }), _jsxs("form", { className: "mt-6 space-y-4", onSubmit: onSubmit, children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Session Name" }), _jsx("input", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.name, onChange: (e) => onChange({ ...formState, name: e.target.value }), required: true })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Track" }), _jsx("input", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.trackName, onChange: (e) => onChange({ ...formState, trackName: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Target Laps" }), _jsx("input", { type: "number", min: 1, className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.lapsTarget, onChange: (e) => onChange({ ...formState, lapsTarget: e.target.value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Drivers" }), _jsx("textarea", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", rows: 6, placeholder: "22, Max Torque, Redwood Racing", value: formState.driversText, onChange: (e) => onChange({ ...formState, driversText: e.target.value }) })] }), _jsx("button", { type: "submit", disabled: submitting, className: "w-full rounded-2xl bg-brand py-3 text-center text-base font-semibold uppercase tracking-widest text-black disabled:opacity-40", children: submitting ? "Creating…" : "Create Session" })] })] }));
};
const SessionHeader = ({ sessionId, name, track, phase, trackStatus, lapsTarget, onStartRace, canStartRace }) => {
    const safePhase = phase || "setup";
    const phaseDisplay = useMemo(() => safePhase.charAt(0).toUpperCase() + safePhase.slice(1), [safePhase]);
    return (_jsxs("header", { className: "grid gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Session" }), _jsx("h1", { className: "text-3xl font-semibold", children: name }), _jsxs("p", { className: "text-white/60", children: [track, " \u00B7 Target laps: ", lapsTarget ?? "—"] }), _jsxs("p", { className: "text-xs text-white/50", children: ["ID: ", sessionId] })] }), _jsxs("div", { className: "flex items-center justify-end gap-4", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 px-4 py-2 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Phase" }), _jsx("p", { className: "text-xl font-semibold", children: phaseDisplay }), _jsxs("p", { className: "text-sm text-white/60", children: ["Track: ", trackStatus] })] }), _jsx("button", { className: "rounded-2xl bg-brand px-5 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40", disabled: !canStartRace, onClick: onStartRace, children: "Start Race" })] })] }));
};
const parseDrivers = (input) => {
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
const formatLap = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
        .toString()
        .padStart(3, "0")}`;
};
const getHotkeyLabel = (driver) => {
    const index = (driver.position ?? 1) - 1;
    return HOTKEYS[index] ?? `#${index + 1}`;
};
const EventCard = ({ event, drivers }) => {
    const timestamp = new Date(event.created_at).toLocaleTimeString();
    const description = formatEventDescription(event, drivers);
    return (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.3em] text-white/40", children: timestamp }), _jsx("p", { className: "mt-1 font-semibold text-white", children: event.kind }), _jsx("p", { className: "text-white/70", children: description })] }));
};
const formatEventDescription = (event, drivers) => {
    if (event.kind === "lap_logged") {
        const driver = drivers.find((d) => d.driver_id === event.payload.driver_id);
        const lapNumber = event.payload.lap_number;
        const lapMs = event.payload.lap_ms;
        return driver
            ? `${driver.driver_name} logged lap ${lapNumber} at ${formatLap(lapMs)}`
            : `Driver ${event.payload.driver_id} logged lap ${lapNumber}`;
    }
    if (event.kind === "race_initialized") {
        return "Race initialized and drivers set to running.";
    }
    if (event.kind === "session_created") {
        return `Session created (${event.payload.name ?? "Untitled"})`;
    }
    return JSON.stringify(event.payload);
};
export default RaceControlPage;
