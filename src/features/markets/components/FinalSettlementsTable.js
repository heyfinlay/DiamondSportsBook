import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatCurrency } from "../utils/format";
const formatShare = (value) => {
    if (!Number.isFinite(value) || value <= 0)
        return "—";
    if (value >= 1)
        return `${value.toFixed(2)}%`;
    return `${value.toFixed(4)}%`;
};
const formatResult = (row) => {
    if (row.status === "void_refund")
        return "REFUND";
    if (row.payout > 0)
        return "WIN";
    if (row.status === "lost")
        return "LOSS";
    if (row.status === "won")
        return "WIN";
    return row.status.toUpperCase();
};
export const FinalSettlementsTable = ({ rows, emptyLabel }) => {
    if (!rows.length) {
        return (_jsx("div", { className: "rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-white/60", children: emptyLabel ?? "No settlement activity recorded for this market yet." }));
    }
    return (_jsx("div", { className: "overflow-hidden rounded-2xl border border-white/10 bg-black/40", children: _jsxs("table", { className: "w-full border-collapse text-sm text-white", children: [_jsx("thead", { className: "bg-white/5 text-left text-xs uppercase tracking-[0.25em] text-white/50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: "Character" }), _jsx("th", { className: "px-4 py-3", children: "Outcome" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Stake" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Final Odds" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Share" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Result" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Payout" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Timestamp" })] }) }), _jsx("tbody", { children: rows.map((row) => {
                        const isWinner = row.payout > 0;
                        const resultLabel = formatResult(row);
                        const timestamp = isWinner ? row.settled_at : row.placed_at;
                        return (_jsxs("tr", { className: isWinner ? "bg-emerald-500/5" : "odd:bg-white/5", children: [_jsxs("td", { className: "px-4 py-3 align-top", children: [_jsx("p", { className: "font-semibold text-white", children: row.character_name || row.username || `User ${row.user_id.slice(0, 8)}…` }), _jsxs("p", { className: "text-xs text-white/50", children: [row.user_id.slice(0, 8), "\u2026"] })] }), _jsx("td", { className: "px-4 py-3 align-top text-white/80", children: row.outcome_label }), _jsx("td", { className: "px-4 py-3 text-right font-semibold text-white", children: formatCurrency(row.stake) }), _jsxs("td", { className: "px-4 py-3 text-right text-white/80", children: ["x", row.effective_odds.toFixed(2)] }), _jsx("td", { className: "px-4 py-3 text-right text-white/70", children: formatShare(row.share_percent) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: `inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.2em] ${isWinner
                                            ? "bg-emerald-500/20 text-emerald-200"
                                            : row.status === "void_refund"
                                                ? "bg-yellow-500/20 text-yellow-200"
                                                : "bg-white/10 text-white/70"}`, children: resultLabel }) }), _jsx("td", { className: "px-4 py-3 text-right font-semibold", children: _jsx("span", { className: isWinner ? "text-emerald-300" : "text-white/70", children: formatCurrency(row.payout) }) }), _jsx("td", { className: "px-4 py-3 text-right text-xs text-white/60", children: new Date(timestamp).toLocaleString() })] }, row.wager_id));
                    }) })] }) }));
};
export default FinalSettlementsTable;
