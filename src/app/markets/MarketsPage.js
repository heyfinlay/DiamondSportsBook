import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, Database, Settings, Waves, LifeBuoy } from "lucide-react";
import { fetchChampionshipSeasons } from "@domains/championship/api/championshipApi";
import { useDriverStandings } from "@domains/standings/api/standingsApi";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys } from "@lib/query/keys";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import PrismaticSideRail from "@app/components/PrismaticSideRail";
import { formatCurrency } from "../../features/markets/utils/format";
const statusOptions = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "closing_soon", label: "Closing Soon" },
    { key: "closed", label: "Closed" },
    { key: "settled", label: "Settled" }
];
const formatTrend = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const getPoolTrend = (pool) => {
    if (!pool.outcomes.length)
        return 0;
    return pool.outcomes.reduce((sum, outcome) => sum + outcome.trendDelta, 0) / pool.outcomes.length;
};
const getPoolSentiment = (pool) => {
    const trend = getPoolTrend(pool);
    if (trend >= 0.8)
        return { label: "Bullish", className: "text-primary-dim" };
    if (trend <= -0.8)
        return { label: "Bearish", className: "text-danger" };
    return { label: "Balanced", className: "text-on-subtle" };
};
const getVaultStatus = (pool) => {
    if (pool.status === "open")
        return "Inspect";
    if (pool.status === "closing_soon")
        return "Watch";
    if (pool.status === "closed")
        return "Locked";
    return "Settled";
};
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
    const [sortKey, setSortKey] = useState("pool");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const filteredPools = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();
        const byStatus = statusFilter === "all" ? pools : pools.filter((pool) => pool.status === statusFilter);
        const bySearch = query
            ? byStatus.filter((pool) => pool.title.toLowerCase().includes(query))
            : byStatus;
        return [...bySearch].sort((a, b) => {
            if (sortKey === "pool")
                return b.totalStake - a.totalStake;
            const aTime = a.timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
            const bTime = b.timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });
    }, [deferredSearchQuery, pools, sortKey, statusFilter]);
    const featuredPool = filteredPools[0] ?? pools[0] ?? null;
    const featuredOutcomes = useMemo(() => [...(featuredPool?.outcomes ?? [])]
        .sort((a, b) => b.marketShare - a.marketShare)
        .slice(0, 2), [featuredPool]);
    const seasonsQuery = useQuery({
        queryKey: ["championship-seasons"],
        queryFn: fetchChampionshipSeasons
    });
    const activeSeasonId = useMemo(() => {
        const seasons = seasonsQuery.data ?? [];
        return seasons.find((season) => season.status === "active")?.id ?? seasons[0]?.id;
    }, [seasonsQuery.data]);
    const standingsQuery = useDriverStandings(activeSeasonId);
    const featuredStandings = (standingsQuery.data ?? []).slice(0, 4);
    const totalHandle = pools.reduce((sum, pool) => sum + pool.totalStake, 0);
    const openPools = pools.filter((pool) => pool.status === "open" || pool.status === "closing_soon").length;
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
    return (_jsxs("div", { className: "grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)]", children: [_jsx(PrismaticSideRail, { title: "Live Intelligence", subtitle: "High-Frequency Data", activeKey: "whale_movements", items: [
                    { key: "whale_movements", label: "Whale Movements", icon: Waves },
                    { key: "prismatic_shifts", label: "Prismatic Shifts", icon: Activity },
                    { key: "market_volume", label: "Market Volume", icon: Database },
                    { key: "settings", label: "Settings", icon: Settings },
                    { key: "support", label: "Support", icon: LifeBuoy }
                ], ctaLabel: "View Global Analytics", ctaTo: "/standings" }), _jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "grid gap-6 2xl:grid-cols-[minmax(0,1.6fr)_21rem]", children: [_jsxs("div", { className: "prismatic-card min-h-[28rem] p-8 md:p-10", children: [_jsx("div", { className: "absolute inset-0 bg-[linear-gradient(102deg,rgba(20,23,26,0.98)_0%,rgba(20,23,26,0.94)_48%,rgba(14,22,27,0.88)_100%)]" }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(225,253,255,0.08),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(0,242,255,0.22),transparent_34%),radial-gradient(circle_at_72%_84%,rgba(0,242,255,0.08),transparent_26%)] opacity-95" }), _jsxs("div", { className: "relative flex h-full flex-col justify-between gap-8", children: [_jsxs("div", { children: [_jsxs("div", { className: "inline-flex items-center gap-2 border border-primary-container/30 bg-primary-container/10 px-3 py-1", children: [_jsx("span", { className: "inline-flex h-2 w-2 bg-primary-container" }), _jsx("span", { className: "prismatic-kicker text-primary-dim", children: "Live Intelligence Active" })] }), _jsxs("div", { className: "mt-8", children: [_jsx("p", { className: "prismatic-kicker", children: "Prime Market" }), _jsx("h1", { className: "mt-3 font-headline text-4xl font-extrabold uppercase tracking-[0.03em] text-white sm:text-5xl lg:text-[4.5rem]", children: featuredPool ? featuredPool.title : "Diamond Sportsbook" }), _jsx("p", { className: "mt-3 max-w-3xl text-sm leading-7 text-on-subtle sm:text-base", children: "Pool-based pricing updates in real time. Lower share means higher payout, while volume signals conviction across the vault." }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-4 text-[0.7rem] uppercase tracking-[0.18em] text-on-subtle", children: [_jsx("span", { children: poolsQuery.isLoading ? "Syncing live pools" : `${pools.length} monitored markets` }), _jsx("span", { className: "inline-flex h-1 w-1 bg-primary-container" }), _jsxs("span", { children: [openPools, " open now"] }), featuredPool?.timeRemainingLabel ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "inline-flex h-1 w-1 bg-danger" }), _jsx("span", { children: featuredPool.timeRemainingLabel })] })) : null] })] })] }), _jsxs("div", { className: "grid gap-4 2xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:items-end", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_14rem]", children: [featuredOutcomes.map((outcome) => (_jsxs("div", { className: "flex min-h-[11rem] min-w-0 flex-col justify-between border border-white/10 bg-surface-highest/60 px-5 py-5 backdrop-blur-xl", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "prismatic-kicker text-[0.58rem]", children: outcome.teamName }), _jsx("p", { className: "mt-2 line-clamp-3 min-h-[4.5rem] font-headline text-lg font-extrabold uppercase tracking-[0.04em] text-white sm:text-xl", children: outcome.driverName })] }), _jsxs("div", { children: [_jsx("p", { className: "font-headline text-3xl font-extrabold text-white sm:text-4xl", children: outcome.baselineOdds.toFixed(2) }), _jsxs("p", { className: "mt-1 text-[0.66rem] uppercase tracking-[0.14em] text-on-subtle", children: [Math.round(outcome.marketShare * 100), "% share"] })] }), _jsx("div", { className: "mt-4 h-1 bg-white/10", children: _jsx("div", { className: "h-full bg-primary-container", style: { width: `${Math.min(Math.max(outcome.marketShare * 100, 10), 100)}%` } }) })] }, outcome.id))), _jsx("div", { className: "flex min-h-[11rem] items-end", children: featuredPool ? (_jsx(Link, { to: `/market/${featuredPool.id}`, className: "prismatic-button prismatic-button-primary w-full px-8 py-5", children: "Enter Vault" })) : null })] }), _jsxs("div", { className: "min-w-0 border border-primary-container/30 bg-[linear-gradient(135deg,rgba(225,253,255,0.14),rgba(0,242,255,0.15))] px-6 py-6 text-left shadow-[0_0_36px_rgba(0,242,255,0.12)]", children: [_jsx("p", { className: "prismatic-kicker text-on-primary/80", children: "Total Pool Liquidity" }), _jsx("p", { className: "mt-3 font-headline text-4xl font-extrabold tracking-tight text-white sm:text-5xl", children: formatCurrency(totalHandle) }), _jsx("p", { className: "mt-3 text-[0.7rem] uppercase tracking-[0.14em] text-on-primary/80", children: featuredPool ? `${featuredPool.totalBets.toLocaleString()} active tickets in focus` : "Waiting for active pool data" })] })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between px-2", children: [_jsx("h2", { className: "prismatic-kicker text-white", children: "Current Standings" }), _jsx(Link, { to: "/wagers", className: "prismatic-kicker text-primary-dim transition hover:text-white", children: "Live Board" })] }), featuredStandings.length ? (featuredStandings.map((driver) => (_jsxs("div", { className: "prismatic-glass flex items-center justify-between gap-4 p-4", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-4", children: [_jsx("div", { className: "flex h-12 w-12 items-center justify-center bg-surface-highest font-headline text-xl font-extrabold text-white", children: String(driver.position).padStart(2, "0") }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[0.6rem] uppercase tracking-[0.16em] text-on-subtle", children: driver.team_name }), _jsx("p", { className: "mt-1 truncate font-headline text-lg font-extrabold uppercase tracking-[0.05em] text-white", children: driver.driver_name })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "font-headline text-2xl font-extrabold text-primary-dim", children: driver.points.toFixed(0) }), _jsx("p", { className: "prismatic-kicker text-[0.58rem]", children: "Pts" })] })] }, driver.driver_id)))) : (_jsx("div", { className: "prismatic-glass p-5 text-sm text-on-subtle", children: standingsQuery.isLoading ? "Loading standings…" : "Standings data will appear here once the active season is available." }))] })] }), _jsxs("section", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "prismatic-metric px-5 py-4", children: [_jsx("p", { className: "prismatic-kicker", children: "Live Pools" }), _jsx("p", { className: "mt-2 font-headline text-3xl font-extrabold text-white", children: pools.length })] }), _jsxs("div", { className: "prismatic-metric px-5 py-4", children: [_jsx("p", { className: "prismatic-kicker", children: "Open Now" }), _jsx("p", { className: "mt-2 font-headline text-3xl font-extrabold text-white", children: openPools })] }), _jsxs("div", { className: "prismatic-metric px-5 py-4", children: [_jsx("p", { className: "prismatic-kicker", children: "Total Handle" }), _jsx("p", { className: "mt-2 font-headline text-3xl font-extrabold text-white", children: formatCurrency(totalHandle) })] })] }), !sessionLoading && !user ? _jsx(AuthCtaBanner, {}) : null, poolsQuery.isLoading ? (_jsx("div", { className: "prismatic-card px-5 py-4 text-sm text-on-subtle", children: "Loading live markets\u2026" })) : null, poolsQuery.isError ? (_jsx("div", { className: "border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger", children: "Unable to load markets right now. Refresh to try again." })) : null, _jsx("section", { className: "prismatic-card p-5", children: _jsxs("div", { className: "flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker", children: "Prime Markets" }), _jsx("h2", { className: "mt-2 font-headline text-3xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Active Vault Board" })] }), _jsxs("div", { className: "flex flex-col gap-4 xl:items-end", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: statusOptions.map((status) => (_jsx("button", { type: "button", onClick: () => setStatusFilter(status.key), className: "prismatic-chip", "data-active": statusFilter === status.key, children: status.label }, status.key))) }), _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row", children: [_jsx("div", { className: "min-w-[18rem] border border-white/10 bg-surface-low px-4", children: _jsx("input", { type: "text", value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), placeholder: "Search markets", className: "prismatic-input" }) }), _jsxs("div", { className: "border border-white/10 bg-surface-low px-4", children: [_jsx("label", { className: "prismatic-kicker block pt-3 text-[0.56rem]", children: "Sort" }), _jsxs("select", { value: sortKey, onChange: (event) => setSortKey(event.target.value), className: "w-full bg-transparent pb-3 pt-2 text-sm text-white outline-none", children: [_jsx("option", { value: "pool", children: "Highest Pool" }), _jsx("option", { value: "closing", children: "Closing Soon" })] })] })] })] })] }) }), filteredPools.length > 0 ? (_jsx(MarketPoolsGrid, { pools: filteredPools, onSelectPool: (poolId) => navigate(`/market/${poolId}`), onSelectOutcome: handleOutcomeSelect })) : (!poolsQuery.isLoading && (_jsxs("div", { className: "prismatic-card flex flex-wrap items-center gap-4 p-8", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-headline text-xl font-extrabold uppercase tracking-[0.08em] text-white", children: "Market board coming online" }), _jsx("p", { className: "mt-2 text-sm text-on-subtle", children: "Admin tools will seed the next tote shortly. Check back when the next event opens betting." })] }), _jsx(Link, { to: "/account", className: "prismatic-button prismatic-button-secondary", children: "Manage Vault" })] }))), _jsxs("section", { className: "prismatic-card p-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Active Intelligence Ledger" }), _jsx("h2", { className: "mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Market Identity" })] }), _jsx(BarChart3, { className: "h-5 w-5 text-primary-dim" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "prismatic-table min-w-full", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 text-left", children: "Market Identity" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Volume (24h)" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Volatility" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Sentiment Index" }), _jsx("th", { className: "px-6 py-4 text-right", children: "Vault Status" })] }) }), _jsx("tbody", { children: pools.slice(0, 4).map((pool) => {
                                                const trend = getPoolTrend(pool);
                                                const sentiment = getPoolSentiment(pool);
                                                const strongestOutcome = [...pool.outcomes].sort((a, b) => b.marketShare - a.marketShare)[0];
                                                return (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-5", children: _jsxs("div", { className: "flex items-start gap-4", children: [_jsx("span", { className: "mt-1 inline-flex h-10 w-1 bg-primary-container" }), _jsxs("div", { children: [_jsx("p", { className: "font-headline text-lg font-extrabold uppercase tracking-[0.05em] text-white", children: pool.title }), _jsxs("p", { className: "mt-1 text-xs uppercase tracking-[0.14em] text-on-subtle", children: [pool.status.replace("_", " "), " \u2022 ", pool.totalBets.toLocaleString(), " bets"] })] })] }) }), _jsx("td", { className: "px-6 py-5 text-xl font-semibold text-white", children: formatCurrency(pool.totalStake) }), _jsx("td", { className: `px-6 py-5 text-lg font-semibold ${trend >= 0 ? "text-primary-dim" : "text-danger"}`, children: formatTrend(trend) }), _jsx("td", { className: "px-6 py-5", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-1.5 w-16 bg-surface-highest", children: _jsx("div", { className: "h-full bg-primary-container", style: { width: `${Math.min(Math.max((strongestOutcome?.marketShare ?? 0) * 100, 5), 100)}%` } }) }), _jsx("span", { className: `prismatic-kicker text-[0.62rem] ${sentiment.className}`, children: sentiment.label })] }) }), _jsx("td", { className: "px-6 py-5 text-right", children: _jsx("button", { type: "button", onClick: () => navigate(`/market/${pool.id}`), className: "prismatic-button prismatic-button-secondary min-h-[2.45rem] px-4 text-[0.62rem]", children: getVaultStatus(pool) }) })] }, pool.id));
                                            }) })] }) })] })] })] }));
};
export default MarketsPage;
