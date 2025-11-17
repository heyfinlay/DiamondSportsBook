import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flag, Activity, Timer } from "lucide-react";
import { fetchDriverStandings, fetchPenalties, fetchPitEvents, fetchSessionDetail, fetchTimingResults } from "@domains/timing/api/timingApi";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { buildLeaderboard, formatLapTime } from "@domains/timing/utils/leaderboard";
import { TrackStatusBanner } from "@domains/timing/components/TrackStatusBanner";
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
    const resultsQuery = useQuery({
        queryKey: ["live-results", sessionId],
        queryFn: () => fetchTimingResults(sessionId),
        enabled: !!sessionId && (sessionQuery.data?.phase === "finished" || sessionQuery.data?.status === "finished")
    });
    const isLoading = sessionQuery.isLoading || driversQuery.isLoading;
    const leaderboard = useMemo(() => buildLeaderboard(driversQuery.data ?? []), [driversQuery.data]);
    const totalDrivers = leaderboard.length;
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("section", { className: "rounded-3xl border border-white/10 bg-gradient-to-br from-[#070C16] to-black/60 p-6 shadow-xl shadow-black/40", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Live timing" }), _jsx("h1", { className: "text-4xl font-semibold tracking-tight text-white", children: sessionQuery.data?.name ?? (isLoading ? "Loading…" : sessionId) }), _jsx("p", { className: "text-sm text-white/70", children: sessionQuery.data?.track_name ?? "Track TBD" })] }), _jsxs("div", { className: "flex gap-4", children: [_jsx(HeroStat, { label: "Track Status", value: sessionQuery.data?.track_status ?? (isLoading ? "…" : "green"), icon: _jsx(Flag, { className: "h-4 w-4" }) }), _jsx(HeroStat, { label: "Phase", value: sessionQuery.data?.phase ?? (isLoading ? "…" : "setup"), icon: _jsx(Activity, { className: "h-4 w-4" }) }), _jsx(HeroStat, { label: "Drivers", value: isLoading ? "…" : totalDrivers.toString(), icon: _jsx(Timer, { className: "h-4 w-4" }) })] })] }) }), sessionQuery.data?.phase === "finished" && (_jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold text-white", children: "Final Classification" }), resultsQuery.isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Loading\u2026" }))] }), _jsxs("div", { className: "mt-4 space-y-3", children: [(resultsQuery.data ?? []).map((result) => (_jsxs("article", { className: "flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-[11px] uppercase tracking-[0.3em] text-white/50", children: ["P", result.position] }), _jsxs("p", { className: "font-semibold text-white", children: ["#", result.driver?.number ?? "—", " ", result.driver?.name ?? "Driver"] }), _jsx("p", { className: "text-xs text-white/60", children: result.driver?.team_name ?? "—" })] }), _jsxs("div", { className: "text-right text-sm text-white", children: [_jsx("p", { children: formatResultGapDisplay(result) }), _jsxs("p", { className: "text-xs text-white/60", children: [result.laps, " laps"] }), _jsx("p", { className: "text-xs text-white/60", children: result.total_time_ms ? formatLapTime(result.total_time_ms) : "—" })] })] }, result.id))), !resultsQuery.isLoading && (resultsQuery.data ?? []).length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No final results saved yet. Race Control must finish the session." }))] })] })), _jsx(TrackStatusBanner, { status: sessionQuery.data?.track_status, variant: "live" }), _jsx("div", { className: "overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl shadow-black/30", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-white/5 text-white/60", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left", children: "Pos" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Driver" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Team" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Laps" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Last Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Best Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Gap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Status" })] }) }), _jsx("tbody", { children: leaderboard.map((driver) => (_jsxs("tr", { className: "border-t border-white/5 hover:bg-white/5", children: [_jsx("td", { className: "px-4 py-3", children: driver.position }), _jsxs("td", { className: "px-4 py-3 font-medium", children: ["#", driver.car_number, " ", driver.driver_name] }), _jsx("td", { className: "px-4 py-3 text-white/70", children: driver.team_name }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.laps_completed }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.displayLastLap }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.displayBestLap }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.displayGap }), _jsx("td", { className: "px-4 py-3 text-right capitalize", children: driver.status })] }, driver.driver_id))) })] }) }), _jsxs("section", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(FeedCard, { title: "Penalties", isLoading: penaltiesQuery.isLoading, emptyCopy: "No penalties yet.", items: penaltiesQuery.data?.map((penalty) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "font-semibold", children: penalty.driver?.name
                                                ? `#${penalty.driver.number ?? "?"} ${penalty.driver.name}`
                                                : "Session Penalty" }), _jsx("p", { className: "text-xs text-white/50", children: formatEventTime(penalty.issued_at) })] }), _jsxs("p", { className: "text-sm text-white/70", children: [penalty.seconds, "s \u00B7 ", penalty.reason] })] }, penalty.id))) ?? [] }), _jsx(FeedCard, { title: "Pit Lane", isLoading: pitEventsQuery.isLoading, emptyCopy: "No pit activity yet.", items: pitEventsQuery.data?.map((pit) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "font-semibold", children: ["#", pit.driver?.number ?? "?", " ", pit.driver?.name ?? "Unknown Driver"] }), _jsx("p", { className: "text-xs text-white/50", children: formatEventTime(pit.started_at) })] }), _jsx("p", { className: "text-sm text-white/70", children: pit.duration_ms ? `${(pit.duration_ms / 1000).toFixed(1)}s stop` : "Duration pending" })] }, pit.id))) ?? [] })] })] }));
};
const formatEventTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
};
const HeroStat = ({ label, value, icon }) => (_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-white/20 bg-black/30 px-5 py-3", children: [_jsx("div", { className: "rounded-full border border-white/20 p-2 text-white", children: icon }), _jsxs("div", { children: [_jsx("p", { className: "text-[0.6rem] uppercase tracking-[0.35em] text-white/50", children: label }), _jsx("p", { className: "text-lg font-semibold capitalize text-white", children: value })] })] }));
const FeedCard = ({ title, items, isLoading, emptyCopy }) => (_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold text-white", children: title }), isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Updating\u2026" }))] }), _jsx("div", { className: "mt-4 space-y-3", children: items.length ? (items) : (_jsx("p", { className: "text-sm text-white/60", children: emptyCopy })) })] }));
const formatResultGapDisplay = (result) => {
    if (result.position === 1)
        return "Leader";
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
export default LiveTimingPage;
