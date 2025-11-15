import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useTimingRealtime } from "@domains/timing/hooks/useTimingRealtime";
import { useTimingStore } from "@domains/timing/store/timingStore";
const phases = ["setup", "warmup", "grid", "race", "finished"];
const RaceControlPage = () => {
    const { sessionId } = useParams();
    useTimingRealtime(sessionId);
    const phase = useTimingStore((state) => state.phase);
    const drivers = useTimingStore((state) => state.drivers);
    return (_jsxs("div", { className: "space-y-8", children: [_jsx("div", { className: "flex flex-wrap items-center gap-3", children: phases.map((name) => (_jsx("button", { className: `rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide ${phase === name
                        ? "bg-brand text-black"
                        : "bg-white/10 text-white/70 hover:text-white"}`, children: name }, name))) }), _jsxs("section", { className: "grid gap-8 lg:grid-cols-[2fr,1fr]", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Drivers" }), _jsx("p", { className: "text-sm text-white/60", children: "Hotkeys + quick lap logging coming soon." })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 px-4 py-2", children: ["Session: ", sessionId ?? "—"] })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-4", children: [_jsxs("div", { className: "grid grid-cols-6 gap-3 text-xs uppercase tracking-wider text-white/60", children: [_jsx("span", { children: "Driver" }), _jsx("span", { children: "Lap" }), _jsx("span", { children: "Last" }), _jsx("span", { children: "Best" }), _jsx("span", { children: "Status" }), _jsx("span", { children: "Actions" })] }), _jsx("div", { className: "mt-3 space-y-2", children: drivers.map((driver) => (_jsxs("div", { className: "grid grid-cols-6 items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-sm", children: [_jsxs("div", { className: "font-semibold", children: ["#", driver.carNumber, " ", driver.name] }), _jsx("div", { children: driver.laps }), _jsx("div", { children: driver.lastLapMs ? formatLap(driver.lastLapMs) : "—" }), _jsx("div", { children: driver.bestLapMs ? formatLap(driver.bestLapMs) : "—" }), _jsx("div", { className: "capitalize", children: driver.status }), _jsx("div", { children: _jsx("button", { className: "rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand", children: "Log Lap" }) })] }, driver.id))) })] })] }), _jsxs("aside", { className: "space-y-4 rounded-3xl border border-white/10 bg-black/40 p-4", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Event Feed" }), _jsx("p", { className: "text-sm text-white/60", children: "Real-time lap, flag, and incident updates will appear here." }), _jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80", children: "Feed placeholder \u2014 connect to `race_events` after backend scaffolding." })] })] })] }));
};
const formatLap = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
        .toString()
        .padStart(3, "0")}`;
};
export default RaceControlPage;
