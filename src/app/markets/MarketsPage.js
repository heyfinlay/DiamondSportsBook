import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys } from "@lib/query/keys";
import { MarketHeroCard } from "../../components/markets/MarketHeroCard";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import { formatCurrency } from "../../features/markets/utils/format";
// This screen keeps the v2 grid layout from commit 9208937 while relying on the team metadata-backed pricing feeds from 23eeb03.
const MarketsPage = () => {
    const navigate = useNavigate();
    const { user, loading: sessionLoading } = useSession();
    const setBetslipSelection = useBettingStore((state) => state.setBetslipSelection);
    const poolsQuery = useQuery({
        queryKey: marketKeys.pools(),
        queryFn: fetchUiPools
    });
    const pools = poolsQuery.data ?? [];
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState("closing");
    const filteredPools = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const byStatus = statusFilter === "all"
            ? pools
            : pools.filter((pool) => pool.status === statusFilter);
        const bySearch = query
            ? byStatus.filter((pool) => pool.title.toLowerCase().includes(query))
            : byStatus;
        const sorted = [...bySearch].sort((a, b) => {
            if (sortKey === "pool")
                return b.totalStake - a.totalStake;
            // closing: use timeRemainingMs if available, otherwise keep stable order
            const aTime = a.timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
            const bTime = b.timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });
        return sorted;
    }, [pools, searchQuery, sortKey, statusFilter]);
    const handleOutcomeSelect = (poolId, poolTitle, outcome) => {
        setBetslipSelection({
            marketId: poolId,
            marketName: poolTitle,
            eventTitle: null,
            outcomeId: outcome.id,
            outcomeLabel: `${outcome.teamName} — ${outcome.driverName}`,
            minStake: 0,
            maxStake: 0,
            stake: 0
        });
        navigate(`/market/${poolId}`);
    };
    return (_jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-8", children: [_jsx(MarketHeroCard, { label: "LIVE MARKETS", title: "Diamond Sportsbook", subLabel: null, description: _jsxs("div", { className: "space-y-2 text-white/80", children: [_jsx("p", { children: "Pool-based odds update in real time. The smaller the share, the bigger the payout." }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-white/50", children: [_jsxs("span", { children: [filteredPools.length, " markets"] }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: poolsQuery.isLoading ? "Syncing" : "Live" })] })] }) }), _jsxs("section", { className: "grid gap-3 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Live pools" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: pools.length })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Open now" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: pools.filter((pool) => pool.status === "open" || pool.status === "closing_soon").length })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Total handle" }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: formatCurrency(pools.reduce((sum, pool) => sum + pool.totalStake, 0)) })] })] }), !sessionLoading && !user && _jsx(AuthCtaBanner, {}), poolsQuery.isLoading && (_jsx("p", { className: "text-sm text-neutral-400", children: "Loading live markets\u2026" })), poolsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load markets right now. Refresh to try again." })), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-4", children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: ["all", "open", "closing_soon", "closed", "settled"].map((status) => (_jsx("button", { type: "button", onClick: () => setStatusFilter(status), className: `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${statusFilter === status
                                        ? "bg-emerald-500 text-slate-950"
                                        : "border border-white/20 text-white/70 hover:border-white/40"}`, children: status.replace("_", " ") }, status))) }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx("input", { type: "text", value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), placeholder: "Search markets", className: "w-64 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs text-white placeholder:text-white/40" }), _jsx("span", { className: "pointer-events-none absolute right-3 top-2 text-xs text-white/40", children: "\u2315" })] }), _jsxs("select", { value: sortKey, onChange: (event) => setSortKey(event.target.value), className: "rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs text-white", children: [_jsx("option", { value: "closing", children: "Sort: Closing soon" }), _jsx("option", { value: "pool", children: "Sort: Pool size" })] })] })] }), _jsxs("p", { className: "mt-3 text-xs text-white/50", children: ["Showing ", filteredPools.length, " of ", pools.length, " pools"] })] }), filteredPools.length > 0 ? (_jsx(MarketPoolsGrid, { pools: filteredPools, onSelectPool: (poolId) => navigate(`/market/${poolId}`), onSelectOutcome: handleOutcomeSelect })) : (!poolsQuery.isLoading && (_jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-[#05070F]/40 p-8 text-sm text-neutral-400", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-semibold text-white", children: "Live market board coming online" }), _jsx("p", { children: "Admin tools will seed the first tote shortly. Check back once the next event opens betting." })] }), _jsx(Link, { to: "/account", className: "inline-flex items-center gap-2 rounded-full border border-[#9FF7D3]/40 px-4 py-2 uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:border-[#9FF7D3]/70 hover:text-white", children: "Manage wallet" })] })))] }));
};
export default MarketsPage;
