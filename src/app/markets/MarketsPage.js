import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Radio, SlidersHorizontal } from "lucide-react";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { formatCurrency } from "../../features/markets/utils/format";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import { fetchSportsBoardEvents } from "@domains/sports/api/sportsDataApi";
import { getSportAccentClass, getSportLabel, getSportSurfaceClass, getSportWatermark } from "@domains/sports/utils/sportsUi";
import { sportsKeys } from "@lib/query/keys";
import { useSession } from "@lib/auth/SessionProvider";
import { usePermissions } from "@lib/auth/usePermissions";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
const statusOptions = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "closing_soon", label: "Closing Soon" },
    { key: "closed", label: "Closed" },
    { key: "settled", label: "Settled" }
];
const SUPPORTED_SPORT_CODES = new Set(["f1", "nrl", "afl", "mma", "soccer"]);
const SUPPORTED_POOL_STATUSES = new Set(["open", "closing_soon", "closed", "settled"]);
const normalizeSportCode = (value) => {
    if (!value)
        return null;
    const normalized = value.toLowerCase();
    return SUPPORTED_SPORT_CODES.has(normalized)
        ? normalized
        : null;
};
const isPoolStatus = (value) => SUPPORTED_POOL_STATUSES.has(value);
const formatTimeRemainingLabel = (closeAt, status) => {
    if (!closeAt) {
        return status === "settled" ? "Settled" : "Awaiting close time";
    }
    const diffMs = new Date(closeAt).getTime() - Date.now();
    if (Number.isNaN(diffMs))
        return "Awaiting close time";
    if (diffMs <= 0) {
        return status === "settled" ? "Settled" : "Closed";
    }
    const totalMinutes = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0
        ? `Closes in ${hours}h ${String(minutes).padStart(2, "0")}m`
        : `Closes in ${minutes}m`;
};
const flattenBoardMarkets = (events) => events.flatMap((event) => event.markets
    .filter((market) => !market.archived && isPoolStatus(market.status))
    .map((market) => {
    const poolStatus = market.status;
    const totalPool = Number(market.totalPool ?? 0);
    return {
        id: market.id,
        title: market.name,
        eventTitle: event.title,
        categoryLabel: getSportLabel(event.sportCode),
        sportCode: event.sportCode,
        status: poolStatus,
        totalStake: totalPool,
        totalBets: market.outcomes.reduce((sum, outcome) => sum + (outcome.pool > 0 ? 1 : 0), 0),
        closeAt: market.closeTime,
        timeRemainingLabel: formatTimeRemainingLabel(market.closeTime, poolStatus),
        rakePercent: event.takeout,
        lastUpdatedLabel: event.publishedAt
            ? new Date(event.publishedAt).toLocaleString()
            : "Awaiting publish",
        outcomes: market.outcomes.map((outcome) => {
            const stake = Number(outcome.pool ?? 0);
            const marketShare = totalPool > 0 ? stake / totalPool : 0;
            return {
                id: outcome.id,
                label: outcome.label,
                primaryLabel: outcome.label,
                secondaryLabel: outcome.participantType
                    ? outcome.participantType.replace(/_/g, " ")
                    : undefined,
                accentColor: outcome.color ?? undefined,
                shortLabel: outcome.label.slice(0, 3).toUpperCase(),
                participantType: outcome.participantType ?? undefined,
                marketShare,
                baselineOdds: stake > 0 ? Math.max((totalPool * (1 - event.takeout)) / stake, 1) : 0,
                numBets: stake > 0 ? 1 : 0,
                diamondsStaked: stake,
                trendDelta: marketShare
            };
        })
    };
}));
const getPageCopy = (sportCode) => {
    if (!sportCode) {
        return {
            title: "Live Markets",
            description: "A multi-sport command surface for published parimutuel pools, event context, and tactical liquidity flow."
        };
    }
    return {
        title: `${getSportLabel(sportCode)} Markets`,
        description: sportCode === "nrl"
            ? "Published Rugby League fixtures, live pool depth, and operator-approved match boards."
            : sportCode === "f1"
                ? "Published Formula 1 sessions, race boards, and automated pools sourced from the live feed."
                : `Published ${getSportLabel(sportCode)} event boards and market liquidity.`
    };
};
const MarketsPage = () => {
    const navigate = useNavigate();
    const { sportCode: sportCodeParam } = useParams();
    const selectedSportCode = normalizeSportCode(sportCodeParam);
    const { user, loading: sessionLoading } = useSession();
    const { isBettingAdmin, isSuperAdmin } = usePermissions();
    const canReviewDrafts = isBettingAdmin || isSuperAdmin;
    const setBetslipSelection = useBettingStore((state) => state.setBetslipSelection);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const boardQueryOptions = useMemo(() => ({
        limit: 24,
        sportCode: selectedSportCode,
        includeUnpublished: canReviewDrafts
    }), [canReviewDrafts, selectedSportCode]);
    const sportsEventsQuery = useQuery({
        queryKey: [...sportsKeys.board(selectedSportCode), canReviewDrafts ? "admin" : "public"],
        queryFn: () => fetchSportsBoardEvents(boardQueryOptions)
    });
    const boardEvents = sportsEventsQuery.data ?? [];
    const liveBoardEvents = useMemo(() => boardEvents.filter((event) => event.published), [boardEvents]);
    const reviewBoardEvents = useMemo(() => boardEvents.filter((event) => !event.published), [boardEvents]);
    const pools = useMemo(() => flattenBoardMarkets(liveBoardEvents), [liveBoardEvents]);
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
    const featuredEvent = liveBoardEvents[0] ?? (canReviewDrafts ? reviewBoardEvents[0] ?? null : null);
    const secondaryEvent = liveBoardEvents[1] ?? (canReviewDrafts ? reviewBoardEvents[1] ?? null : null);
    const featuredPools = filteredPools.slice(0, 6);
    const totalHandle = filteredPools.reduce((sum, pool) => sum + pool.totalStake, 0);
    const openPools = filteredPools.filter((pool) => pool.status === "open" || pool.status === "closing_soon").length;
    const pageCopy = getPageCopy(selectedSportCode);
    const intelligenceFeed = useMemo(() => {
        if (!boardEvents.length) {
            return [
                selectedSportCode
                    ? `${getSportLabel(selectedSportCode)} sync is connected, but no published event boards are live yet.`
                    : "Sports sync pipeline is ready. Published boards will populate once admin review is complete.",
                "Auto-generated market templates stay in draft until an admin publishes the event.",
                "Settlement signals surface automatically after official provider results are written."
            ];
        }
        return boardEvents.slice(0, 3).map((event) => {
            const venue = event.sportsEvent?.venueName ??
                event.sportsEvent?.competition?.name ??
                "Live board";
            const marketCount = event.markets.filter((market) => !market.archived).length;
            return `${event.title} • ${venue} • ${marketCount} published pool${marketCount === 1 ? "" : "s"}`;
        });
    }, [boardEvents, selectedSportCode]);
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
    return (_jsxs("div", { className: "space-y-10", children: [canReviewDrafts && reviewBoardEvents.length ? (_jsx("section", { className: "border border-primary-container/20 bg-primary-container/10 px-5 py-4", children: _jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-primary-container", children: "Admin Review Queue" }), _jsxs("p", { className: "mt-1 text-sm text-white", children: [reviewBoardEvents.length, " synced event", reviewBoardEvents.length === 1 ? "" : "s", " are in draft review and hidden from public betting until published."] })] }), _jsx(Link, { to: "/admin/sports", className: "prismatic-button prismatic-button-secondary min-h-[2.2rem] px-4 text-[0.58rem]", children: "Open Review Queue" })] }) })) : null, _jsxs("section", { className: "grid gap-8 xl:grid-cols-[minmax(0,1.75fr)_22rem]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-5", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle", children: [_jsxs("span", { className: `inline-flex items-center gap-2 ${getSportAccentClass(selectedSportCode)}`, children: [_jsx(Radio, { className: "h-3.5 w-3.5" }), "Active Streams: ", boardEvents.length || 0] }), _jsxs("span", { children: ["Total Liquidity: ", formatCurrency(totalHandle)] })] }), _jsxs("div", { className: "flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-headline text-5xl font-black uppercase tracking-tight text-white sm:text-6xl lg:text-7xl", children: pageCopy.title }), _jsx("p", { className: "mt-4 max-w-3xl text-sm leading-7 text-on-subtle sm:text-base", children: pageCopy.description })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: statusOptions.map((option) => (_jsx("button", { type: "button", onClick: () => setStatusFilter(option.key), className: "prismatic-chip", "data-active": statusFilter === option.key, children: option.label }, option.key))) })] }), _jsx("div", { className: "flex flex-col gap-3 sm:flex-row", children: _jsx("input", { type: "search", value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), placeholder: `Search ${selectedSportCode ? getSportLabel(selectedSportCode) : "live"} events and pools`, className: "min-h-[3rem] flex-1 border border-outline-variant/15 bg-surface-lowest px-4 text-sm text-white outline-none transition placeholder:text-on-subtle focus:border-primary-container/35" }) })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]", children: [_jsx("section", { className: `prismatic-card min-h-[24rem] bg-gradient-to-br ${getSportSurfaceClass(featuredEvent?.sportCode ?? selectedSportCode)} p-6 sm:p-8`, children: _jsxs("div", { className: "relative z-10 flex h-full flex-col justify-between", children: [_jsxs("div", { className: "flex items-start justify-between gap-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("span", { className: "border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-primary-container", children: featuredEvent?.published === false ? "In Review" : "Featured" }), _jsx("span", { className: getSportAccentClass(featuredEvent?.sportCode ?? selectedSportCode), children: getSportLabel(featuredEvent?.sportCode ?? selectedSportCode) })] }), _jsx("h2", { className: "mt-4 max-w-3xl font-headline text-3xl font-black uppercase tracking-tight text-white sm:text-5xl", children: featuredEvent?.title ?? "Awaiting Published Events" }), _jsx("p", { className: "mt-3 text-sm uppercase tracking-[0.14em] text-on-subtle", children: featuredEvent?.sportsEvent?.venueName ??
                                                                        featuredEvent?.sportsEvent?.competition?.name ??
                                                                        "Sync + admin publish are required before markets are visible here" })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Closes In" }), _jsx("p", { className: "mt-2 font-headline text-3xl font-black text-white", children: featuredEvent?.markets[0]?.closeTime
                                                                        ? new Date(featuredEvent.markets[0].closeTime).toLocaleTimeString([], {
                                                                            hour: "2-digit",
                                                                            minute: "2-digit"
                                                                        })
                                                                        : "Standby" })] })] }), _jsxs("div", { className: "relative mt-10", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]", children: _jsx("span", { className: "font-headline text-[7rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[10rem]", children: getSportWatermark(featuredEvent?.sportCode ?? selectedSportCode) }) }), featuredEvent?.markets[0] ? (_jsxs("div", { className: "relative space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Live Pool Weights" }), _jsxs("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [featuredEvent.markets[0].outcomes.length, " outcomes"] })] }), _jsx("div", { className: "flex h-16 items-end gap-1", children: featuredEvent.markets[0].outcomes.slice(0, 4).map((outcome) => {
                                                                        const share = featuredEvent.markets[0].totalPool > 0
                                                                            ? (outcome.pool / featuredEvent.markets[0].totalPool) * 100
                                                                            : 0;
                                                                        const height = `${Math.max(share, 12)}%`;
                                                                        return (_jsxs("div", { className: "flex flex-1 flex-col justify-end gap-2", children: [_jsx("div", { className: "w-full", style: {
                                                                                        height,
                                                                                        backgroundColor: outcome.color ?? "#00f0ff"
                                                                                    } }), _jsx("p", { className: "truncate text-[0.58rem] font-bold uppercase tracking-[0.14em] text-on-subtle", children: outcome.label })] }, outcome.id));
                                                                    }) }), _jsxs("div", { className: "grid gap-4 pt-4 sm:grid-cols-3", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker", children: "Pool Liquidity" }), _jsx("p", { className: "mt-2 font-headline text-2xl font-black text-white", children: formatCurrency(featuredEvent.markets[0].totalPool) })] }), _jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker", children: "Status" }), _jsx("p", { className: "mt-2 font-headline text-2xl font-black text-primary-fixed", children: featuredEvent.markets[0].status.toUpperCase() })] }), _jsx("div", { className: "flex items-end justify-start sm:justify-end", children: _jsx(Link, { to: `/events/${featuredEvent.id}`, className: "prismatic-button prismatic-button-primary w-full px-6 text-[0.64rem] sm:w-auto", children: featuredEvent.published ? "Enter Event" : "Preview Event" }) })] })] })) : (_jsx("div", { className: "relative border border-outline-variant/15 bg-surface-lowest/80 p-6 text-sm text-on-subtle", children: "Auto-generated markets remain in admin review until the event is published." }))] })] }) }), _jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10 flex h-full flex-col justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Activity, { className: "h-4 w-4 text-primary-container" }), _jsx("p", { className: "prismatic-kicker text-white", children: "Trending Event" })] }), _jsx("h3", { className: "mt-5 font-headline text-2xl font-bold uppercase tracking-tight text-white", children: secondaryEvent?.title ?? "Awaiting next board" }), _jsx("p", { className: "mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: secondaryEvent
                                                                ? `${getSportLabel(secondaryEvent.sportCode)} • ${secondaryEvent.markets.length} pools`
                                                                : "Operator-published events will appear here" }), _jsx("div", { className: "mt-8 space-y-4", children: (secondaryEvent?.markets.slice(0, 2) ?? []).map((market) => (_jsxs(Link, { to: `/market/${market.id}`, className: "block border border-outline-variant/15 bg-surface-lowest/80 p-4 transition hover:border-primary-container/25", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: market.name }), _jsxs("div", { className: "mt-3 flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [_jsx("span", { children: formatCurrency(market.totalPool) }), _jsx("span", { children: market.status })] })] }, market.id))) })] }), _jsxs("div", { className: "mt-8 border-t border-outline-variant/15 pt-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "prismatic-kicker", children: "Open Pools" }), _jsx("p", { className: "font-headline text-2xl font-black text-primary-container", children: openPools })] }), _jsxs("div", { className: "mt-4 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: [_jsx("span", { children: "Filter by liquidity" }), _jsx(SlidersHorizontal, { className: "h-4 w-4" })] })] })] }) })] }), !sessionLoading && !user ? _jsx(AuthCtaBanner, {}) : null] }), _jsxs("aside", { className: "space-y-6", children: [_jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Command Metrics" }), _jsxs("div", { className: "mt-6 grid gap-4", children: [_jsx(MetricCard, { label: "Published Events", value: String(boardEvents.length) }), _jsx(MetricCard, { label: "Open Pools", value: String(openPools) }), _jsx(MetricCard, { label: "Total Liquidity", value: formatCurrency(totalHandle) })] })] }) }), _jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Tactical Feed" }), _jsx("div", { className: "mt-5 space-y-3", children: intelligenceFeed.map((item, index) => (_jsxs("div", { className: "border-l-2 border-primary-container/40 bg-surface-lowest/80 px-4 py-3", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-primary-container", children: index === 0 ? "pool_update" : index === 1 ? "event_info" : "system_msg" }), _jsx("p", { className: "mt-2 text-sm text-on-surface", children: item })] }, item))) })] }) })] })] }), _jsxs("section", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Prime Markets" }), _jsx("h2", { className: "mt-2 font-headline text-3xl font-black uppercase tracking-tight text-white", children: "Active Published Pools" })] }), selectedSportCode ? (_jsxs(Link, { to: "/", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", children: ["All Sports", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] })) : (_jsxs("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", children: ["Live Board", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] }))] }), sportsEventsQuery.isLoading ? (_jsx("div", { className: "prismatic-card p-6 text-on-subtle", children: "Loading published sports board\u2026" })) : featuredPools.length ? (_jsx(MarketPoolsGrid, { pools: featuredPools, onSelectPool: (poolId) => navigate(`/market/${poolId}`), onSelectOutcome: handleOutcomeSelect })) : (_jsx("div", { className: "prismatic-card p-6 text-on-subtle", children: "No published pools match the current view yet. Sync the provider and publish the event from admin review first." }))] }));
};
const MetricCard = ({ label, value }) => (_jsxs("div", { className: "border-l-2 border-primary-container bg-surface-lowest/85 px-4 py-4", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle", children: label }), _jsx("p", { className: "mt-3 font-headline text-3xl font-black text-white", children: value })] }));
export default MarketsPage;
