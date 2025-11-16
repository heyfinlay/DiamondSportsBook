import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchDriverStandings, fetchPenalties, fetchPitEvents, fetchSessionDetail } from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
const LiveTimingPage = () => {
    const { sessionId } = useParams();
    useTimingRealtime(sessionId);
    if (!sessionId) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Provide a session ID in the URL to view live timing." }));
    }
    const sessionQuery = useQuery({
        queryKey: ["live-session", sessionId],
        queryFn: () => fetchSessionDetail(sessionId),
        enabled: !!sessionId
    });
    const driversQuery = useQuery({
        queryKey: ["live-standings", sessionId],
        queryFn: () => fetchDriverStandings(sessionId),
        enabled: !!sessionId
    });
    const penaltiesQuery = useQuery({
        queryKey: ["live-penalties", sessionId],
        queryFn: () => fetchPenalties(sessionId),
        enabled: !!sessionId
    });
    const pitEventsQuery = useQuery({
        queryKey: ["live-pit-events", sessionId],
        queryFn: () => fetchPitEvents(sessionId),
        enabled: !!sessionId
    });
    const isLoading = sessionQuery.isLoading || driversQuery.isLoading;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-widest text-white/60", children: "Session" }), _jsx("h1", { className: "text-2xl font-semibold", children: sessionQuery.data?.name ?? (isLoading ? "Loading…" : sessionId) }), _jsx("p", { className: "text-sm text-white/60", children: sessionQuery.data?.track_name ?? "Track TBD" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-6 py-3 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Track Status" }), _jsx("p", { className: "text-lg font-semibold capitalize", children: sessionQuery.data?.track_status ?? (isLoading ? "…" : "green") })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-6 py-3 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Phase" }), _jsx("p", { className: "text-lg font-semibold capitalize", children: sessionQuery.data?.phase ?? (isLoading ? "…" : "setup") })] })] }), _jsx("div", { className: "overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl shadow-black/30", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-white/5 text-white/60", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left", children: "Pos" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Driver" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Team" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Laps" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Last Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Best Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Gap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Status" })] }) }), _jsx("tbody", { children: driversQuery.data?.map((driver, idx) => (_jsxs("tr", { className: "border-t border-white/5 hover:bg-white/5", children: [_jsx("td", { className: "px-4 py-3", children: driver.position ?? idx + 1 }), _jsxs("td", { className: "px-4 py-3 font-medium", children: ["#", driver.car_number, " ", driver.driver_name] }), _jsx("td", { className: "px-4 py-3 text-white/70", children: driver.team_name }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.laps_completed }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.last_lap_ms ? formatLap(driver.last_lap_ms) : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.best_lap_ms ? formatLap(driver.best_lap_ms) : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.gap_to_leader_ms
                                            ? `+${formatLap(driver.gap_to_leader_ms)}`
                                            : "Leader" }), _jsx("td", { className: "px-4 py-3 text-right capitalize", children: driver.status })] }, driver.driver_id))) })] }) }), _jsxs("section", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Penalties" }), penaltiesQuery.isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Updating\u2026" }))] }), _jsxs("div", { className: "mt-4 space-y-3", children: [penaltiesQuery.data?.map((penalty) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "font-semibold", children: penalty.driver?.display_name
                                                            ? `#${penalty.driver.car_number ?? "?"} ${penalty.driver.display_name}`
                                                            : "Session Penalty" }), _jsx("p", { className: "text-xs text-white/50", children: formatEventTime(penalty.issued_at) })] }), _jsxs("p", { className: "text-sm text-white/70", children: [penalty.seconds, "s \u00B7 ", penalty.reason] })] }, penalty.id))), penaltiesQuery.data && penaltiesQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No penalties yet." }))] })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Pit Events" }), pitEventsQuery.isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Updating\u2026" }))] }), _jsxs("div", { className: "mt-4 space-y-3", children: [pitEventsQuery.data?.map((pit) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "font-semibold", children: ["#", pit.driver?.car_number ?? "?", " ", pit.driver?.display_name ?? "Unknown Driver"] }), _jsx("p", { className: "text-xs text-white/50", children: formatEventTime(pit.started_at) })] }), _jsx("p", { className: "text-sm text-white/70", children: pit.duration_ms ? formatDuration(pit.duration_ms) : "Duration pending" })] }, pit.id))), pitEventsQuery.data && pitEventsQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No pit activity yet." }))] })] })] })] }));
};
const formatLap = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
        .toString()
        .padStart(3, "0")}`;
};
const formatEventTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
};
const formatDuration = (ms) => {
    return `${(ms / 1000).toFixed(1)}s`;
};
export default LiveTimingPage;
