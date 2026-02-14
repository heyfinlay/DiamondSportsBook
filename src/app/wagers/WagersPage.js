import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useSession } from "@lib/auth/SessionProvider";
import { useUserWagers } from "@domains/betting/hooks/useUserWagers";
import { currencySymbol } from "@lib/currency";
const formatStatus = (status) => status ? status.replace(/_/g, " ") : "pending";
const WagersPage = () => {
    const { user, loading } = useSession();
    const wagersQuery = useUserWagers(user?.id);
    const wagers = wagersQuery.data ?? [];
    const [statusFilter, setStatusFilter] = useState("all");
    const filteredWagers = useMemo(() => {
        if (statusFilter === "all")
            return wagers;
        return wagers.filter((wager) => wager.status === statusFilter);
    }, [statusFilter, wagers]);
    const totalStaked = wagers.reduce((sum, wager) => sum + wager.stake, 0);
    const totalWon = wagers.filter((w) => w.status === "won").length;
    const totalLost = wagers.filter((w) => w.status === "lost").length;
    if (!user && !loading) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in to review your wagers." }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Activity" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: "My Wagers" }), _jsx("p", { className: "text-sm text-white/60", children: "Track every bet you placed with settlement status and payouts." })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: ["all", "won", "lost", "pending", "void_refund"].map((status) => (_jsx("button", { type: "button", onClick: () => setStatusFilter(status), className: `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${statusFilter === status
                                ? "bg-emerald-500 text-slate-950"
                                : "border border-white/20 text-white/70 hover:border-white/40"}`, children: status.replace("_", " ") }, status))) })] }), _jsxs("section", { className: "grid gap-3 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Total staked" }), _jsxs("p", { className: "mt-1 text-lg font-semibold", children: [currencySymbol, totalStaked.toFixed(2)] })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Wins" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: totalWon })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Losses" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: totalLost })] })] }), wagersQuery.isLoading ? (_jsx("p", { className: "text-sm text-white/60", children: "Loading wagers\u2026" })) : wagers.length === 0 ? (_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-white/60", children: ["You haven\u2019t placed any wagers yet. Visit the", " ", _jsx(Link, { to: "/", className: "text-brand", children: "markets board" }), " ", "to get started."] })) : (_jsx("div", { className: "space-y-4", children: filteredWagers.map((wager) => (_jsxs("article", { className: "rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white shadow-[0_0_24px_rgba(2,6,23,0.45)] transition hover:border-emerald-400/30 hover:shadow-[0_0_32px_rgba(16,185,129,0.12)]", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-white/50", children: [_jsx("span", { children: wager.market_type.replace(/_/g, " ") }), _jsx("span", { className: `rounded-full px-2 py-0.5 ${wager.status === "won"
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : wager.status === "lost"
                                            ? "bg-red-500/20 text-red-300"
                                            : wager.status === "void_refund"
                                                ? "bg-yellow-500/20 text-yellow-300"
                                                : "bg-blue-500/20 text-blue-200"}`, children: formatStatus(wager.status) })] }), _jsxs("div", { className: "mt-3 flex flex-col gap-1", children: [_jsxs("p", { className: "text-lg font-semibold", children: [`${currencySymbol}${wager.stake.toFixed(2)}`, " on ", wager.outcome_label] }), _jsx("p", { className: "text-xs text-white/60", children: wager.market_name }), _jsx("p", { className: "text-xs text-white/60", children: wager.event_title })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60", children: [_jsxs("div", { children: [_jsxs("span", { children: ["Odds ", wager.effective_odds.toFixed(2)] }), _jsx("span", { className: "mx-1", children: "\u00B7" }), wager.status === "won" && wager.settled_payout ? (_jsxs("span", { className: "font-semibold text-emerald-300", children: ["Paid ", `${currencySymbol}${wager.settled_payout.toFixed(2)}`] })) : (_jsxs("span", { children: ["Potential ", `${currencySymbol}${wager.estimated_payout.toFixed(2)}`] }))] }), _jsx(Link, { to: `/wagers/${wager.id}`, className: "text-xs font-semibold uppercase tracking-[0.3em] text-brand transition hover:text-white", children: "View details \u2192" })] }), _jsxs("p", { className: "mt-1 text-xs text-white/40", children: ["Placed ", new Date(wager.created_at).toLocaleString()] })] }, wager.id))) }))] }));
};
export default WagersPage;
