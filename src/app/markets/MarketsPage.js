import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";
import { currencyLabel } from "@lib/currency";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys } from "@lib/query/keys";
// This screen keeps the v2 grid layout from commit 9208937 while relying on the team metadata-backed pricing feeds from 23eeb03.
const MarketsPage = () => {
    const navigate = useNavigate();
    const { user, loading: sessionLoading } = useSession();
    const poolsQuery = useQuery({
        queryKey: marketKeys.pools(),
        queryFn: fetchUiPools
    });
    const pools = poolsQuery.data ?? [];
    const capitalizedCurrencyLabel = currencyLabel.charAt(0).toUpperCase() + currencyLabel.slice(1);
    return (_jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-8", children: [_jsxs("header", { className: "overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-8 shadow-[0_0_40px_rgba(15,23,42,0.45)]", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("span", { className: "text-[11px] uppercase tracking-[0.35em] text-amber-200/80", children: "DayBreak Grand Prix" }), _jsx("h1", { className: "text-4xl font-semibold text-white sm:text-5xl", children: "Diamond Sportsbook \u2014 Race 1 Markets" }), _jsx("p", { className: "max-w-3xl text-sm text-neutral-300 sm:text-base", children: "Browse live parimutuel pools and place your Diamonds on qualifying and race outcomes. Odds move with every bet, locking in when the market closes." })] }), _jsxs("div", { className: "mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70", children: [_jsx("span", { className: "rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-100", children: "Markets open" }), _jsx("span", { className: "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70", children: "Track: Paleto Bay Circuit" }), _jsxs("span", { className: "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70", children: ["Currency: ", capitalizedCurrencyLabel] })] }), _jsx("p", { className: "mt-4 text-[0.7rem] uppercase tracking-[0.3em] text-neutral-500", children: "Parody product; no real-world stakes." })] }), !sessionLoading && !user && _jsx(AuthCtaBanner, {}), poolsQuery.isLoading && (_jsx("p", { className: "text-sm text-neutral-400", children: "Loading live markets\u2026" })), poolsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load markets right now. Refresh to try again." })), pools.length > 0 ? (_jsx(MarketPoolsGrid, { pools: pools, onSelectPool: (poolId) => navigate(`/market/${poolId}`) })) : (!poolsQuery.isLoading && (_jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-[#05070F]/40 p-8 text-sm text-neutral-400", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-semibold text-white", children: "Live market board coming online" }), _jsx("p", { children: "Admin tools will seed the first tote shortly. Check back once the next event opens betting." })] }), _jsx(Link, { to: "/account", className: "inline-flex items-center gap-2 rounded-full border border-[#9FF7D3]/40 px-4 py-2 uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:border-[#9FF7D3]/70 hover:text-white", children: "Manage wallet" })] })))] }));
};
export default MarketsPage;
