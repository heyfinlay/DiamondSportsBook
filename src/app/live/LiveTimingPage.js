import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchDriverStandings, fetchSessionDetail } from "@domains/timing/api/timingApi";
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
        enabled: !!sessionId,
        refetchInterval: 3000
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-widest text-white/60", children: "Session" }), _jsx("h1", { className: "text-2xl font-semibold", children: sessionQuery.data?.name ?? sessionId ?? "—" }), _jsx("p", { className: "text-sm text-white/60", children: sessionQuery.data?.track_name ?? "Track TBD" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-6 py-3 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Track Status" }), _jsx("p", { className: "text-lg font-semibold capitalize", children: sessionQuery.data?.track_status ?? "green" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-6 py-3 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Phase" }), _jsx("p", { className: "text-lg font-semibold capitalize", children: sessionQuery.data?.phase ?? "setup" })] })] }), _jsx("div", { className: "overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl shadow-black/30", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-white/5 text-white/60", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left", children: "Pos" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Driver" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Team" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Laps" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Last Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Best Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Gap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Status" })] }) }), _jsxs("tbody", { children: [driversQuery.isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-6 text-center text-white/60", children: "Loading standings\u2026" }) })), driversQuery.data?.map((driver, idx) => (_jsxs("tr", { className: "border-t border-white/5 hover:bg-white/5", children: [_jsx("td", { className: "px-4 py-3", children: driver.position ?? idx + 1 }), _jsxs("td", { className: "px-4 py-3 font-medium", children: ["#", driver.car_number, " ", driver.driver_name] }), _jsx("td", { className: "px-4 py-3 text-white/70", children: driver.team_name }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.laps_completed }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.last_lap_ms ? formatLap(driver.last_lap_ms) : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.best_lap_ms ? formatLap(driver.best_lap_ms) : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.gap_to_leader_ms
                                                ? `+${formatLap(driver.gap_to_leader_ms)}`
                                                : "Leader" }), _jsx("td", { className: "px-4 py-3 text-right capitalize", children: driver.status })] }, driver.driver_id)))] })] }) })] }));
};
const formatLap = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
        .toString()
        .padStart(3, "0")}`;
};
export default LiveTimingPage;
