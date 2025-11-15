import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useTimingStore } from "@domains/timing/store/timingStore";
const LiveTimingPage = () => {
    const { sessionId } = useParams();
    useTimingRealtime(sessionId);
    const drivers = useTimingStore((state) => state.drivers);
    const trackStatus = useTimingStore((state) => state.trackStatus);
    const phase = useTimingStore((state) => state.phase);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-widest text-white/60", children: "Session" }), _jsx("h1", { className: "text-2xl font-semibold", children: sessionId ?? "—" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-6 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Track Status" }), _jsx("p", { className: "text-lg font-semibold capitalize", children: trackStatus })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-6 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Phase" }), _jsx("p", { className: "text-lg font-semibold capitalize", children: phase })] })] }), _jsx("div", { className: "overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl shadow-black/30", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-white/5 text-white/60", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left", children: "Pos" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Driver" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Team" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Laps" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Last Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Best Lap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Gap" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Status" })] }) }), _jsx("tbody", { children: drivers.map((driver, idx) => (_jsxs("tr", { className: "border-t border-white/5 hover:bg-white/5", children: [_jsx("td", { className: "px-4 py-3", children: idx + 1 }), _jsxs("td", { className: "px-4 py-3 font-medium", children: ["#", driver.carNumber, " ", driver.name] }), _jsx("td", { className: "px-4 py-3 text-white/70", children: driver.team }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.laps }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.lastLapMs ? formatLap(driver.lastLapMs) : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.bestLapMs ? formatLap(driver.bestLapMs) : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: driver.gapToLeaderMs ? `+${formatLap(driver.gapToLeaderMs)}` : "Leader" }), _jsx("td", { className: "px-4 py-3 text-right capitalize", children: driver.status })] }, driver.id))) })] }) })] }));
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
