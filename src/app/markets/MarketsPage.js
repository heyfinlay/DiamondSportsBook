import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Radio, SlidersHorizontal } from "lucide-react";
import { fetchUiPools } from "../../features/markets/api";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { formatCurrency } from "../../features/markets/utils/format";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import { fetchSportsBoardEvents } from "@domains/sports/api/sportsDataApi";
import { getSportAccentClass, getSportLabel, getSportSurfaceClass, getSportWatermark } from "@domains/sports/utils/sportsUi";
import { marketKeys, sportsKeys } from "@lib/query/keys";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
const statusOptions = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "closing_soon", label: "Closing Soon" },
    { key: "closed", label: "Closed" },
    { key: "settled", label: "Settled" }
];
const MarketsPage = () => {
    const navigate = useNavigate();
    const { user, loading: sessionLoading } = useSession();
    const setBetslipSelection = useBettingStore((state) => state.setBetslipSelection);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const poolsQuery = useQuery({
        queryKey: marketKeys.pools(),
        queryFn: fetchUiPools
    });
    const sportsEventsQuery = useQuery({
        queryKey: sportsKeys.board(),
        queryFn: () => fetchSportsBoardEvents(18)
    });
    const pools = poolsQuery.data ?? [];
    const boardEvents = sportsEventsQuery.data ?? [];
    const filteredPools = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();
        const byStatus = statusFilter === "all" ? pools : pools.filter((pool) => pool.status === statusFilter);
        if (!query)
            return byStatus;
        return byStatus.filter((pool) => {
            const haystack = `${pool.title} ${pool.eventTitle ?? ""} ${pool.categoryLabel ?? ""}`
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [deferredSearchQuery, pools, statusFilter]);
    const featuredEvent = boardEvents[0] ?? null;
    const secondaryEvent = boardEvents[1] ?? null;
    const featuredPools = filteredPools.slice(0, 6);
    const totalHandle = filteredPools.reduce((sum, pool) => sum + pool.totalStake, 0);
    const openPools = filteredPools.filter((pool) => pool.status === "open" || pool.status === "closing_soon").length;
    const intelligenceFeed = useMemo(() => {
        if (!boardEvents.length) {
            return [
                "Sports sync pipeline ready. Connect provider jobs to populate tactical updates.",
                "Pool automation will appear here once external feed events are linked to market templates.",
                "Settlement signals will surface after official result states arrive from the provider."
            ];
        }
        return boardEvents.slice(0, 3).map((event) => {
            const venue = event.sportsEvent?.venueName ?? event.sportsEvent?.competition?.name ?? "Live board";
            const marketCount = event.markets.filter((market) => !market.archived).length;
            return `${event.title} • ${venue} • ${marketCount} active pool${marketCount === 1 ? "" : "s"}`;
        });
    }, [boardEvents]);
    const handleOutcomeSelect = (poolId, poolTitle, outcome) => {
        setBetslipSelection({
            marketId: poolId,
            marketName: poolTitle,
            eventTitle: null,
            outcomeId: outcome.id,
            outcomeLabel: outcome.secondaryLabel
                ? `${outcome.primaryLabel} — ${outcome.secondaryLabel}`
                : outcome.primaryLabel,
            minStake: 0,
            maxStake: 0,
            stake: 0
        });
        navigate(`/market/${poolId}`);
    };
    return (_jsxs("div", { className: "space-y-10", children: [_jsxs("section", { className: "grid gap-8 xl:grid-cols-[minmax(0,1.75fr)_22rem]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-5", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle", children: [_jsxs("span", { className: "inline-flex items-center gap-2 text-primary-container", children: [_jsx(Radio, { className: "h-3.5 w-3.5" }), "Active Streams: ", boardEvents.length || 0] }), _jsxs("span", { children: ["Total Liquidity: ", formatCurrency(totalHandle)] })] }), _jsxs("div", { className: "flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-headline text-5xl font-black uppercase tracking-tight text-white sm:text-6xl lg:text-7xl", children: "Live Markets" }), _jsx("p", { className: "mt-4 max-w-3xl text-sm leading-7 text-on-subtle sm:text-base", children: "A multi-sport command surface for live parimutuel pools, event context, and tactical liquidity flow." })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: statusOptions.map((option) => (_jsx("button", { type: "button", onClick: () => setStatusFilter(option.key), className: "prismatic-chip", "data-active": statusFilter === option.key, children: option.label }, option.key))) })] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]", children: [_jsx("section", { className: `prismatic-card min-h-[24rem] bg-gradient-to-br ${getSportSurfaceClass(featuredEvent?.sportCode)} p-6 sm:p-8`, children: _jsxs("div", { className: "relative z-10 flex h-full flex-col justify-between", children: [_jsxs("div", { className: "flex items-start justify-between gap-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("span", { className: "border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-primary-container", children: "Featured" }), _jsx("span", { className: getSportAccentClass(featuredEvent?.sportCode), children: getSportLabel(featuredEvent?.sportCode) })] }), _jsx("h2", { className: "mt-4 max-w-3xl font-headline text-3xl font-black uppercase tracking-tight text-white sm:text-5xl", children: featuredEvent?.title ?? "Sports Feed Ready" }), _jsx("p", { className: "mt-3 text-sm uppercase tracking-[0.14em] text-on-subtle", children: featuredEvent?.sportsEvent?.venueName ??
                                                                        featuredEvent?.sportsEvent?.competition?.name ??
                                                                        "Connect a live provider to populate the event board" })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Closes In" }), _jsx("p", { className: "mt-2 font-headline text-3xl font-black text-white", children: featuredEvent?.markets[0]?.closeTime
                                                                        ? new Date(featuredEvent.markets[0].closeTime).toLocaleTimeString([], {
                                                                            hour: "2-digit",
                                                                            minute: "2-digit"
                                                                        })
                                                                        : "Standby" })] })] }), _jsxs("div", { className: "relative mt-10", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]", children: _jsx("span", { className: "font-headline text-[7rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[10rem]", children: getSportWatermark(featuredEvent?.sportCode) }) }), featuredEvent?.markets[0] ? (_jsxs("div", { className: "relative space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Live Pool Weights" }), _jsxs("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [featuredEvent.markets[0].outcomes.length, " outcomes"] })] }), _jsx("div", { className: "flex h-16 items-end gap-1", children: featuredEvent.markets[0].outcomes.slice(0, 4).map((outcome) => {
                                                                        const share = featuredEvent.markets[0].totalPool > 0
                                                                            ? (outcome.pool / featuredEvent.markets[0].totalPool) * 100
                                                                            : 0;
                                                                        const height = `${Math.max(share, 12)}%`;
                                                                        return (_jsxs("div", { className: "flex flex-1 flex-col justify-end gap-2", children: [_jsx("div", { className: "w-full", style: {
                                                                                        height,
                                                                                        backgroundColor: outcome.color ?? "#00f0ff"
                                                                                    } }), _jsx("p", { className: "truncate text-[0.58rem] font-bold uppercase tracking-[0.14em] text-on-subtle", children: outcome.label })] }, outcome.id));
                                                                    }) }), _jsxs("div", { className: "grid gap-4 pt-4 sm:grid-cols-3", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker", children: "Pool Liquidity" }), _jsx("p", { className: "mt-2 font-headline text-2xl font-black text-white", children: formatCurrency(featuredEvent.markets[0].totalPool) })] }), _jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker", children: "Status" }), _jsx("p", { className: "mt-2 font-headline text-2xl font-black text-primary-fixed", children: featuredEvent.markets[0].status.toUpperCase() })] }), _jsx("div", { className: "flex items-end justify-start sm:justify-end", children: _jsx(Link, { to: `/events/${featuredEvent.id}`, className: "prismatic-button prismatic-button-primary w-full px-6 text-[0.64rem] sm:w-auto", children: "Enter Event" }) })] })] })) : (_jsx("div", { className: "relative border border-outline-variant/15 bg-surface-lowest/80 p-6 text-sm text-on-subtle", children: "Market templates will appear here after the first sports event is synced and generated." }))] })] }) }), _jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10 flex h-full flex-col justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Activity, { className: "h-4 w-4 text-primary-container" }), _jsx("p", { className: "prismatic-kicker text-white", children: "Trending Event" })] }), _jsx("h3", { className: "mt-5 font-headline text-2xl font-bold uppercase tracking-tight text-white", children: secondaryEvent?.title ?? "Awaiting schedule sync" }), _jsx("p", { className: "mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: secondaryEvent
                                                                ? `${getSportLabel(secondaryEvent.sportCode)} • ${secondaryEvent.markets.length} pools`
                                                                : "Secondary event intelligence will appear here" }), _jsx("div", { className: "mt-8 space-y-4", children: (secondaryEvent?.markets.slice(0, 2) ?? []).map((market) => (_jsxs(Link, { to: `/market/${market.id}`, className: "block border border-outline-variant/15 bg-surface-lowest/80 p-4 transition hover:border-primary-container/25", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: market.name }), _jsxs("div", { className: "mt-3 flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [_jsx("span", { children: formatCurrency(market.totalPool) }), _jsx("span", { children: market.status })] })] }, market.id))) })] }), _jsxs("div", { className: "mt-8 border-t border-outline-variant/15 pt-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "prismatic-kicker", children: "Open Pools" }), _jsx("p", { className: "font-headline text-2xl font-black text-primary-container", children: openPools })] }), _jsxs("div", { className: "mt-4 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: [_jsx("span", { children: "Filter by liquidity" }), _jsx(SlidersHorizontal, { className: "h-4 w-4" })] })] })] }) })] }), !sessionLoading && !user ? _jsx(AuthCtaBanner, {}) : null] }), _jsxs("aside", { className: "space-y-6", children: [_jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Command Metrics" }), _jsxs("div", { className: "mt-6 grid gap-4", children: [_jsx(MetricCard, { label: "Live Pools", value: String(pools.length) }), _jsx(MetricCard, { label: "Open Now", value: String(openPools) }), _jsx(MetricCard, { label: "Total Liquidity", value: formatCurrency(totalHandle) })] })] }) }), _jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Tactical Feed" }), _jsx("div", { className: "mt-5 space-y-3", children: intelligenceFeed.map((item, index) => (_jsxs("div", { className: "border-l-2 border-primary-container/40 bg-surface-lowest/80 px-4 py-3", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-primary-container", children: index === 0 ? "pool_update" : index === 1 ? "event_info" : "system_msg" }), _jsx("p", { className: "mt-2 text-sm text-on-surface", children: item })] }, item))) })] }) })] })] }), _jsxs("section", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Prime Markets" }), _jsx("h2", { className: "mt-2 font-headline text-3xl font-black uppercase tracking-tight text-white", children: "Active High-Stakes Pools" })] }), _jsxs("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", children: ["View All", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] })] }), _jsx(MarketPoolsGrid, { pools: featuredPools, onSelectPool: (poolId) => navigate(`/market/${poolId}`), onSelectOutcome: handleOutcomeSelect })] }));
};
const MetricCard = ({ label, value }) => (_jsxs("div", { className: "border-l-2 border-primary-container bg-surface-lowest/85 px-4 py-4", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle", children: label }), _jsx("p", { className: "mt-3 font-headline text-3xl font-black text-white", children: value })] }));
export default MarketsPage;
