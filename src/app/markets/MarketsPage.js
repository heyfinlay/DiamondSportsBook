import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys } from "@lib/query/keys";
import { useBettingStore } from "@domains/betting/store/bettingStore";
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
    return (_jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-8", children: [_jsxs("section", { className: "space-y-1.5 rounded-2xl border border-white/10 bg-black/30 p-4 text-white", children: [_jsx("p", { className: "text-lg font-semibold", children: "Welcome to Diamond Sportsbook." }), _jsx("p", { className: "text-sm text-white/80", children: "Bet on the DayBreak Grand Prix using live pool-based odds." }), _jsx("p", { className: "text-sm text-white/80", children: "Lower market share means a higher potential payout." }), _jsx("p", { className: "text-sm text-white/80", children: "Choose a market, pick a driver, and place your bet." })] }), !sessionLoading && !user && _jsx(AuthCtaBanner, {}), poolsQuery.isLoading && (_jsx("p", { className: "text-sm text-neutral-400", children: "Loading live markets\u2026" })), poolsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load markets right now. Refresh to try again." })), pools.length > 0 ? (_jsx(MarketPoolsGrid, { pools: pools, onSelectPool: (poolId) => navigate(`/market/${poolId}`), onSelectOutcome: handleOutcomeSelect })) : (!poolsQuery.isLoading && (_jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-[#05070F]/40 p-8 text-sm text-neutral-400", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-semibold text-white", children: "Live market board coming online" }), _jsx("p", { children: "Admin tools will seed the first tote shortly. Check back once the next event opens betting." })] }), _jsx(Link, { to: "/account", className: "inline-flex items-center gap-2 rounded-full border border-[#9FF7D3]/40 px-4 py-2 uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:border-[#9FF7D3]/70 hover:text-white", children: "Manage wallet" })] })))] }));
};
export default MarketsPage;
