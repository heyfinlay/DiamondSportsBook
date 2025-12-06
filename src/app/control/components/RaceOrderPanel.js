import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatLapTime } from "@domains/timing/utils/leaderboard";
const DRIVER_STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "ready", label: "Ready" },
    { value: "finished", label: "Finished" },
    { value: "retired", label: "Retired" },
    { value: "dnf", label: "DNF" },
    { value: "dns", label: "DNS" }
];
const sortEntries = (entries) => {
    const sorted = [...entries];
    sorted.sort((a, b) => {
        const aDisplay = a.display_position ?? Number.MAX_SAFE_INTEGER;
        const bDisplay = b.display_position ?? Number.MAX_SAFE_INTEGER;
        if (aDisplay !== bDisplay)
            return aDisplay - bDisplay;
        const aPos = a.position ?? Number.MAX_SAFE_INTEGER;
        const bPos = b.position ?? Number.MAX_SAFE_INTEGER;
        if (aPos !== bPos)
            return aPos - bPos;
        return a.car_number - b.car_number;
    });
    return sorted;
};
const parseLapInput = (value) => {
    const raw = value.trim();
    if (!raw)
        return null;
    let minutes = 0;
    let secondsPortion = raw;
    if (raw.includes(":")) {
        const [minPart, secPart] = raw.split(":");
        minutes = Number(minPart);
        secondsPortion = secPart ?? "";
        if (!Number.isFinite(minutes))
            return undefined;
    }
    const seconds = Number(secondsPortion);
    if (!Number.isFinite(seconds))
        return undefined;
    const totalSeconds = minutes * 60 + seconds;
    const ms = Math.round(totalSeconds * 1000);
    if (ms <= 0)
        return undefined;
    return ms;
};
const formatInputValue = (ms) => (ms && ms > 0 ? formatLapTime(ms, "") : "");
const RaceOrderPanel = ({ entries, onReorder, onUpdateBestLap, onUpdateStatus, disabled, savingOrder, savingLap, statusUpdating, notify }) => {
    const [orderedEntries, setOrderedEntries] = useState([]);
    const [lapInputs, setLapInputs] = useState({});
    const [localOrdering, setLocalOrdering] = useState(false);
    useEffect(() => {
        const sorted = sortEntries(entries);
        setOrderedEntries(sorted);
        const nextInputs = {};
        sorted.forEach((entry) => {
            nextInputs[entry.driver_id] = formatInputValue(entry.best_lap_ms);
        });
        setLapInputs(nextInputs);
    }, [entries]);
    const isReorderDisabled = disabled || savingOrder || localOrdering;
    const isBestLapDisabled = disabled || savingLap;
    const isStatusDisabled = disabled || statusUpdating;
    const saveOrder = (nextOrder) => {
        const payload = nextOrder.map((entry, index) => ({
            driverId: entry.driver_id,
            displayPosition: index + 1
        }));
        setOrderedEntries(nextOrder.map((entry, index) => ({
            ...entry,
            display_position: index + 1
        })));
        setLocalOrdering(true);
        Promise.resolve(onReorder(payload))
            .catch((error) => {
            notify({
                variant: "error",
                title: "Unable to update order",
                description: error instanceof Error ? error.message : "Manual order could not be saved."
            });
            setOrderedEntries(sortEntries(entries));
        })
            .finally(() => setLocalOrdering(false));
    };
    const moveDriver = (driverId, direction) => {
        if (isReorderDisabled)
            return;
        const currentIndex = orderedEntries.findIndex((driver) => driver.driver_id === driverId);
        const targetIndex = currentIndex + direction;
        if (currentIndex === -1 || targetIndex < 0 || targetIndex >= orderedEntries.length)
            return;
        const next = [...orderedEntries];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, moved);
        saveOrder(next);
    };
    const handleBestLapSave = (driverId) => {
        const input = lapInputs[driverId] ?? "";
        const parsed = parseLapInput(input);
        if (parsed === undefined) {
            notify({
                variant: "error",
                title: "Invalid lap time",
                description: "Use mm:ss.sss or ss.sss format."
            });
            return;
        }
        Promise.resolve(onUpdateBestLap(driverId, parsed))
            .then(() => {
            setLapInputs((prev) => ({
                ...prev,
                [driverId]: formatInputValue(parsed)
            }));
        })
            .catch((error) => {
            notify({
                variant: "error",
                title: "Unable to update lap",
                description: error instanceof Error ? error.message : "Best lap could not be saved."
            });
        });
    };
    const handleStatusChange = (driverId, status) => {
        Promise.resolve(onUpdateStatus(driverId, status)).catch((error) => {
            notify({
                variant: "error",
                title: "Unable to update status",
                description: error instanceof Error ? error.message : "Driver status update failed."
            });
        });
    };
    const headline = useMemo(() => {
        if (localOrdering || savingOrder)
            return "Saving order…";
        if (disabled)
            return "Session locked";
        return "Click arrows to adjust running order";
    }, [disabled, localOrdering, savingOrder]);
    return (_jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Race Order" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Manual Running Order" })] }), _jsx("p", { className: "text-xs text-white/50", children: headline })] }), _jsxs("div", { className: "space-y-2", children: [orderedEntries.map((driver, index) => (_jsxs("article", { className: "flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:gap-4", children: [_jsxs("div", { className: "flex items-center gap-3 sm:w-48", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("button", { className: "rounded-full border border-white/20 p-1 text-white/80 hover:bg-white/10 disabled:opacity-30", onClick: () => moveDriver(driver.driver_id, -1), disabled: isReorderDisabled || index === 0, "aria-label": "Move up", children: _jsx(ArrowUp, { className: "h-4 w-4" }) }), _jsx("button", { className: "rounded-full border border-white/20 p-1 text-white/80 hover:bg-white/10 disabled:opacity-30", onClick: () => moveDriver(driver.driver_id, 1), disabled: isReorderDisabled || index === orderedEntries.length - 1, "aria-label": "Move down", children: _jsx(ArrowDown, { className: "h-4 w-4" }) })] }), _jsxs("div", { children: [_jsxs("span", { className: "inline-flex rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70", children: ["P", index + 1] }), _jsxs("p", { className: "mt-1 text-lg font-semibold text-white", children: ["#", driver.car_number, " ", driver.driver_name] }), _jsx("p", { className: "text-xs text-white/60", children: driver.team_name })] })] }), _jsxs("div", { className: "grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.3em] text-white/40", children: "Status" }), _jsx("select", { className: "w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white", value: driver.status, onChange: (event) => handleStatusChange(driver.driver_id, event.target.value), disabled: isStatusDisabled, children: DRIVER_STATUS_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.3em] text-white/40", children: "Best Lap" }), _jsx("input", { className: "w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-white", placeholder: "1:32.457", value: lapInputs[driver.driver_id] ?? "", onChange: (event) => setLapInputs((prev) => ({ ...prev, [driver.driver_id]: event.target.value })), onBlur: () => handleBestLapSave(driver.driver_id), onKeyDown: (event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        handleBestLapSave(driver.driver_id);
                                                    }
                                                }, disabled: isBestLapDisabled })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.3em] text-white/40", children: "Last Saved" }), _jsx("p", { className: "rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white/80", children: driver.best_lap_ms ? formatLapTime(driver.best_lap_ms) : "—" })] })] })] }, driver.driver_id))), !orderedEntries.length && (_jsx("p", { className: "text-sm text-white/60", children: "No drivers registered in this session yet." }))] })] }));
};
export default RaceOrderPanel;
