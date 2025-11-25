import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const formatGap = (result) => {
    if (result.position_display === "1")
        return "—";
    if (result.gap_to_leader)
        return result.gap_to_leader;
    return result.status ?? "—";
};
const RaceResultsTable = ({ data }) => {
    if (!data.length) {
        return (_jsx("div", { className: "rounded-2xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-white/60", children: "No classified results for this round yet." }));
    }
    return (_jsx("div", { className: "overflow-hidden rounded-2xl border border-white/10 bg-black/40", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-white/5 text-left text-xs uppercase tracking-wide text-white/60", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Pos" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Driver" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Team" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Grid" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "\u0394 Leader" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Status" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Points" })] }) }), _jsx("tbody", { children: data.map((result) => {
                        const retired = ["DNF", "DSQ"].includes(result.position_display.toUpperCase()) ||
                            result.status?.toUpperCase().includes("DNF") ||
                            result.status?.toUpperCase().includes("DSQ");
                        return (_jsxs("tr", { className: retired ? "opacity-60" : "hover:bg-white/5", children: [_jsx("td", { className: "px-4 py-3 text-sm font-semibold text-white/80", children: result.position_display }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex flex-col", children: [_jsxs("span", { className: "flex items-center gap-2 font-medium", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: result.team_color || "#fff" } }), result.driver_name, result.fastest_lap ? (_jsx("span", { className: "rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-200", children: "FL" })) : null] }), _jsx("span", { className: "text-xs text-white/60", children: result.team_name })] }) }), _jsx("td", { className: "px-4 py-3 text-white/70", children: result.team_name }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: result.grid_position }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: formatGap(result) }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: result.status }), _jsx("td", { className: "px-4 py-3 text-right text-base font-semibold text-white", children: result.points_awarded })] }, `${result.session_id}-${result.driver_id}`));
                    }) })] }) }));
};
export default RaceResultsTable;
