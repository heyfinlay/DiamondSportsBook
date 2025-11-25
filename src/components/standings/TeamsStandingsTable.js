import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const formatDelta = (value) => {
    if (value === null || Number.isNaN(value))
        return "—";
    if (value === 0)
        return "Leader";
    return `+${value.toFixed(1)}`;
};
const TeamsStandingsTable = ({ data }) => {
    if (!data.length) {
        return (_jsx("div", { className: "rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/60", children: "Teams standings will populate once results are submitted." }));
    }
    return (_jsx("div", { className: "overflow-hidden rounded-2xl border border-white/10 bg-black/40", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-white/5 text-left text-xs uppercase tracking-wide text-white/60", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Pos" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Team" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Points" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Wins" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Podiums" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Starts" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "\u0394 Leader" })] }) }), _jsx("tbody", { children: data.map((team, index) => (_jsxs("tr", { className: index === 0 ? "bg-white/5" : "hover:bg-white/5", children: [_jsx("td", { className: "px-4 py-3 font-semibold text-white/80", children: team.position }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "flex flex-col", children: _jsxs("span", { className: "flex items-center gap-2 font-medium", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: team.team_color || "#fff" } }), team.team_name] }) }) }), _jsx("td", { className: "px-4 py-3 text-right text-base font-semibold text-white", children: team.points.toFixed(1).replace(/\.0$/, "") }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: team.wins }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: team.podiums }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: team.starts }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: formatDelta(team.diff_to_leader) })] }, team.team_id))) })] }) }));
};
export default TeamsStandingsTable;
