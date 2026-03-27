import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";
import { fetchSportsEventDetail } from "@domains/sports/api/sportsDataApi";
import { getSportAccentClass, getSportLabel, getSportSurfaceClass, getSportWatermark } from "@domains/sports/utils/sportsUi";
import { sportsKeys } from "@lib/query/keys";
import { formatCurrency } from "../../features/markets/utils/format";
const formatLiveMetricValue = (value) => {
    if (typeof value === "number")
        return value.toString();
    if (typeof value === "string")
        return value;
    if (typeof value === "boolean")
        return value ? "Yes" : "No";
    return "—";
};
const EventDetailPage = () => {
    const { eventId } = useParams();
    const eventQuery = useQuery({
        queryKey: sportsKeys.event(eventId),
        queryFn: () => fetchSportsEventDetail(eventId),
        enabled: !!eventId
    });
    const event = eventQuery.data;
    const liveMetrics = useMemo(() => {
        const liveState = event?.sportsEvent?.liveState ?? {};
        const entries = Object.entries(liveState).slice(0, 4);
        if (entries.length) {
            return entries.map(([key, value]) => ({
                label: key.replace(/_/g, " "),
                value: formatLiveMetricValue(value)
            }));
        }
        return [
            {
                label: "Event Status",
                value: event?.sportsEvent?.status ?? event?.status ?? "Standby"
            },
            {
                label: "Venue",
                value: event?.sportsEvent?.venueName ?? "Awaiting feed"
            },
            {
                label: "Round",
                value: event?.sportsEvent?.roundLabel ?? "TBD"
            },
            {
                label: "Clock",
                value: event?.sportsEvent?.liveClock ?? "—"
            }
        ];
    }, [event]);
    const participants = useMemo(() => {
        return [...(event?.sportsEvent?.participants ?? [])].sort((a, b) => {
            const aRank = a.liveRank ?? Number.MAX_SAFE_INTEGER;
            const bRank = b.liveRank ?? Number.MAX_SAFE_INTEGER;
            return aRank - bRank;
        });
    }, [event?.sportsEvent?.participants]);
    const activePools = event?.markets.filter((market) => !market.archived) ?? [];
    if (!eventId) {
        return _jsx("div", { className: "prismatic-card p-6 text-on-subtle", children: "Event not found." });
    }
    if (eventQuery.isLoading) {
        return _jsx("div", { className: "prismatic-card p-6 text-on-subtle", children: "Loading event intelligence\u2026" });
    }
    if (!event) {
        return _jsx("div", { className: "prismatic-card p-6 text-on-subtle", children: "No external event is linked to this board yet." });
    }
    return (_jsxs("div", { className: "space-y-10", children: [_jsx("section", { className: `prismatic-card bg-gradient-to-br ${getSportSurfaceClass(event.sportCode)} p-6 sm:p-8`, children: _jsxs("div", { className: "relative z-10 space-y-8", children: [_jsxs("div", { className: "flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("span", { className: "border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-primary-container", children: "Live Now" }), _jsx("span", { className: `text-[0.68rem] uppercase tracking-[0.18em] ${getSportAccentClass(event.sportCode)}`, children: getSportLabel(event.sportCode) }), _jsx("span", { className: "text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle", children: event.sportsEvent?.roundLabel ?? event.sportsEvent?.competition?.name ?? "Live board" })] }), _jsx("h1", { className: "mt-4 max-w-4xl font-headline text-4xl font-black uppercase tracking-tight text-white sm:text-6xl", children: event.title }), _jsx("p", { className: "mt-4 text-sm leading-7 text-on-subtle", children: event.description ?? "Sports context, participant order, and pool access are unified into a single event hub." })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4", children: liveMetrics.map((metric) => (_jsxs("div", { className: "border border-outline-variant/15 bg-surface-lowest/80 px-4 py-4", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle", children: metric.label }), _jsx("p", { className: "mt-2 font-headline text-2xl font-black text-white", children: metric.value })] }, metric.label))) })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]", children: [_jsxs("div", { className: "relative overflow-hidden border border-outline-variant/15 bg-surface-lowest/70 p-6", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]", children: _jsx("span", { className: "font-headline text-[7rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[10rem]", children: getSportWatermark(event.sportCode) }) }), _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Participant Order" }), _jsxs("p", { className: "text-[0.62rem] uppercase tracking-[0.18em] text-on-subtle", children: [participants.length, " tracked"] })] }), _jsx("div", { className: "mt-6 space-y-3", children: participants.slice(0, 5).map((participant, index) => (_jsxs("div", { className: "grid grid-cols-[3rem_minmax(0,1fr)_5rem] items-center gap-4 bg-surface-low px-4 py-4", children: [_jsx("div", { className: "font-headline text-2xl font-black text-white", children: String(participant.liveRank ?? index + 1).padStart(2, "0") }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-headline text-lg font-bold uppercase tracking-[0.03em] text-white", children: participant.displayName }), _jsx("p", { className: "mt-1 text-[0.64rem] uppercase tracking-[0.16em] text-on-subtle", children: participant.side ?? participant.participantType })] }), _jsx("div", { className: "text-right", children: _jsx("p", { className: "font-headline text-xl font-black text-primary-fixed", children: participant.score != null ? participant.score : "—" }) })] }, participant.id))) })] })] }), _jsxs("aside", { className: "space-y-6", children: [_jsx("div", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Available Pools" }), _jsx("div", { className: "mt-6 space-y-4", children: activePools.length ? (activePools.map((market) => (_jsxs(Link, { to: `/market/${market.id}`, className: "block border border-outline-variant/15 bg-surface-lowest/80 p-4 transition hover:border-primary-container/25", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-headline text-xl font-bold uppercase tracking-[0.04em] text-white", children: market.name }), _jsxs("p", { className: "mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [market.status, " \u2022 ", market.outcomes.length, " outcomes"] })] }), _jsx(ArrowRight, { className: "h-4 w-4 text-primary-container" })] }), _jsxs("div", { className: "mt-4 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em]", children: [_jsx("span", { className: "text-on-subtle", children: "Liquidity" }), _jsx("span", { className: "font-semibold text-white", children: formatCurrency(market.totalPool) })] })] }, market.id)))) : (_jsx("div", { className: "border border-outline-variant/15 bg-surface-lowest/80 p-4 text-sm text-on-subtle", children: "No active pools are linked to this event yet." })) })] }) }), _jsx("div", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Timer, { className: "h-4 w-4 text-primary-container" }), _jsx("p", { className: "prismatic-kicker text-white", children: "Tactical Updates" })] }), _jsxs("div", { className: "mt-5 space-y-3", children: [(event.sportsEvent?.results.slice(0, 3) ?? []).map((result) => (_jsxs("div", { className: "border-l-2 border-primary-container/40 bg-surface-lowest/80 px-4 py-3", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-primary-container", children: result.resultStatus }), _jsxs("p", { className: "mt-2 text-sm text-on-surface", children: [result.participantName, result.outcomeText ? ` • ${result.outcomeText}` : "", result.scoreText ? ` • ${result.scoreText}` : ""] })] }, `${result.participantId}-${result.resultStatus}`))), !event.sportsEvent?.results.length ? (_jsx("div", { className: "border-l-2 border-outline-variant/20 bg-surface-lowest/80 px-4 py-3 text-sm text-on-subtle", children: "Official result updates will appear here once the provider marks the event final." })) : null] })] }) })] })] })] }) }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx("div", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Feed State" }), _jsxs("div", { className: "mt-6 space-y-3", children: [_jsx(StateRow, { label: "Source Type", value: event.sourceType ?? "external_feed" }), _jsx(StateRow, { label: "External Status", value: event.externalStatus ?? event.sportsEvent?.status ?? "standby" }), _jsx(StateRow, { label: "Competition", value: event.sportsEvent?.competition?.name ?? "Unmapped" })] })] }) }), _jsx("div", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Market Automation" }), _jsxs("div", { className: "mt-6 space-y-3", children: [_jsx(StateRow, { label: "Auto-Managed Pools", value: String(activePools.filter((market) => market.autoManaged).length) }), _jsx(StateRow, { label: "Total Pools", value: String(activePools.length) }), _jsx(StateRow, { label: "Featured Pool", value: activePools[0]?.name ?? "Pending" })] })] }) })] })] }));
};
const StateRow = ({ label, value }) => (_jsxs("div", { className: "flex items-center justify-between border-b border-outline-variant/15 pb-3 text-sm", children: [_jsx("span", { className: "text-on-subtle", children: label }), _jsx("span", { className: "font-semibold text-white", children: value })] }));
export default EventDetailPage;
