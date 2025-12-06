import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function OutcomeTile({ outcomeId, teamCode, teamName, teamColor, driverName, oddsLabel, poolShareLabel, isFavourite, isBestPayout, isSelected, onSelect }) {
    const pillBase = "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]";
    const teamLine = `${teamCode.toUpperCase()} • ${teamName}`;
    return (_jsxs("button", { type: "button", onClick: () => onSelect?.(), className: `group flex h-full min-h-[110px] flex-col justify-between rounded-xl border px-3 py-2 text-left transition ${isSelected
            ? "border-amber-400/70 bg-slate-900 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
            : "border-slate-800/80 bg-slate-950/70 hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-slate-900"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-0`, children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx("span", { "aria-hidden": true, className: "inline-flex h-2 w-2 shrink-0 rounded-full", style: { backgroundColor: teamColor ?? "#94a3b8" } }), _jsxs("span", { className: "truncate text-[12px] font-semibold leading-tight text-slate-50", title: teamName, children: [_jsx("span", { className: "uppercase tracking-[0.25em]", children: teamCode }), _jsxs("span", { className: "text-slate-300", children: [" \u2022 ", teamName] })] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [isFavourite && (_jsx("span", { className: `${pillBase} border-emerald-400/60 bg-emerald-500/10 text-emerald-100`, children: "Fav" })), isBestPayout && (_jsx("span", { className: `${pillBase} border-blue-400/60 bg-blue-500/10 text-blue-100`, children: "Best" }))] })] }), _jsx("p", { className: "truncate text-[11px] text-slate-400", style: {
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                }, title: driverName, children: driverName }), _jsxs("div", { className: "mt-1 flex items-center justify-between text-sm", children: [_jsx("span", { className: "font-semibold text-white", children: oddsLabel }), _jsx("span", { className: "text-xs text-slate-400", children: poolShareLabel })] })] }));
}
