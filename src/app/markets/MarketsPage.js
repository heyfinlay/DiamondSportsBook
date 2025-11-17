import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchMarketEvents } from "@domains/betting/api/bettingApi";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import { useToast } from "@app/components/ToastProvider";
import { previewWager } from "@domains/betting/api/bettingApi";
const highlights = [
    {
        title: "Event-driven pools",
        copy: "Follow tote movement across every DBGP session. Markets pull directly from race control telemetry."
    },
    {
        title: "Realtime odds pulses",
        copy: "Diamonds shift every few seconds—watch the payout estimate evolve before you lock in."
    }
];
const DEFAULT_STAKE = 100;
const formatStatus = (status) => {
    if (!status)
        return "Unknown";
    return status.replace(/_/g, " ");
};
const formatClosesAt = (closeTime) => {
    if (!closeTime)
        return "No scheduled close";
    const closeDate = new Date(closeTime);
    if (Number.isNaN(closeDate.getTime()))
        return "No scheduled close";
    const diffMs = closeDate.getTime() - Date.now();
    if (diffMs <= 0)
        return "Closed";
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 60)
        return `Closes in ${minutes}m`;
    const hours = Math.round(minutes / 60);
    return `Closes in ${hours}h`;
};
const MarketsPage = () => {
    const { toast } = useToast();
    const openBetslip = useBettingStore((state) => state.openBetslip);
    const setPreviewData = useBettingStore((state) => state.setPreviewData);
    const eventsQuery = useQuery({
        queryKey: ["markets", "events"],
        queryFn: fetchMarketEvents
    });
    const previewMutation = useMutation({
        mutationFn: ({ marketId, outcomeId, stake }) => previewWager(marketId, outcomeId, stake),
        onSuccess: (result) => setPreviewData(result),
        onError: (error) => {
            toast({
                variant: "error",
                title: "Unable to preview wager",
                description: error.message
            });
        }
    });
    const handleOutcomeSelect = (event, market, outcome) => {
        const initialStake = market.min_stake
            ? Math.max(market.min_stake, DEFAULT_STAKE)
            : DEFAULT_STAKE;
        openBetslip({
            marketId: market.id,
            marketName: market.name,
            eventTitle: event.title,
            outcomeId: outcome.id,
            outcomeLabel: outcome.label,
            minStake: market.min_stake,
            maxStake: market.max_stake,
            stake: initialStake
        });
        setPreviewData(null);
        previewMutation.mutate({
            marketId: market.id,
            outcomeId: outcome.id,
            stake: initialStake
        });
    };
    const hasEvents = (eventsQuery.data?.length ?? 0) > 0;
    return (_jsxs("div", { className: "flex flex-col gap-10", children: [_jsxs("header", { className: "flex flex-col gap-5 rounded-3xl border border-white/5 bg-[#060910]/80 p-8 shadow-[0_0_40px_rgba(15,23,42,0.45)]", children: [_jsx("span", { className: "text-xs uppercase tracking-[0.35em] text-[#9FF7D3]", children: "Diamond Sports Book" }), _jsx("h1", { className: "text-4xl font-semibold text-white sm:text-5xl", children: "Markets and tote boards" }), _jsx("p", { className: "max-w-2xl text-sm text-neutral-300 sm:text-base", children: "Back podium hopefuls, safety car drama, or fastest lap heroes. Pick a market to preview odds, watch pool growth, and lock in Diamonds before the grid goes green." }), _jsx("p", { className: "text-[0.7rem] uppercase tracking-[0.3em] text-neutral-500", children: "All wagers settled in Diamonds (in-game currency). Parody product; no real-world stakes." })] }), _jsx("section", { className: "grid gap-6 md:grid-cols-2", children: highlights.map((highlight) => (_jsxs("div", { className: "flex flex-col gap-3 rounded-3xl border border-white/5 bg-[#05070F]/80 p-6", children: [_jsx("h2", { className: "text-xl font-semibold text-white", children: highlight.title }), _jsx("p", { className: "text-sm text-neutral-400", children: highlight.copy })] }, highlight.title))) }), eventsQuery.isLoading && (_jsx("p", { className: "text-sm text-neutral-400", children: "Loading live markets\u2026" })), eventsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load markets right now. Refresh to try again." })), hasEvents ? (_jsx("section", { className: "flex flex-col gap-6", children: eventsQuery.data?.map((event) => (_jsxs("div", { className: "flex flex-col gap-4 rounded-3xl border border-white/5 bg-[#05070F]/80 p-6", children: [_jsxs("header", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-xs uppercase tracking-[0.35em] text-[#7C6BFF]", children: "Event" }), _jsx("h2", { className: "text-2xl font-semibold text-white", children: event.title }), _jsxs("p", { className: "text-sm text-neutral-400", children: [event.venue ? `${event.venue} • ` : "", event.starts_at ? new Date(event.starts_at).toLocaleString() : "Schedule TBC"] })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2", children: event.markets.map((market) => (_jsxs("article", { className: "flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#060910]/80 p-4", children: [_jsxs("div", { className: "flex items-center justify-between text-xs uppercase tracking-[0.35em] text-neutral-500", children: [_jsx("span", { children: market.type }), _jsx("span", { children: formatStatus(market.status) })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: market.name }), market.description && (_jsx("p", { className: "text-xs text-neutral-400", children: market.description }))] }), _jsxs("p", { className: "text-xs text-neutral-400", children: [formatClosesAt(market.close_time), " \u2022 Pool \u0189", market.total_pool.toLocaleString()] }), _jsxs("ul", { className: "flex flex-wrap gap-2 text-xs text-neutral-300", children: [market.outcomes.slice(0, 4).map((outcome) => (_jsx("li", { children: _jsx("button", { type: "button", className: "rounded-full border border-white/10 px-3 py-1 transition hover:border-brand hover:text-brand", onClick: () => handleOutcomeSelect(event, market, outcome), children: outcome.label }) }, outcome.id))), market.outcomes.length > 4 && (_jsxs("li", { className: "rounded-full border border-white/10 px-3 py-1 text-neutral-500", children: ["+", market.outcomes.length - 4, " more"] }))] }), _jsx(Link, { to: `/market/${market.id}`, className: "text-xs font-semibold uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:text-white", children: "View details \u2192" })] }, market.id))) })] }, event.id))) })) : (!eventsQuery.isLoading && (_jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-[#05070F]/40 p-8 text-sm text-neutral-400", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-semibold text-white", children: "Live market board coming online" }), _jsx("p", { children: "Admin tools will seed the first tote shortly. Check back once the next event opens betting." })] }), _jsx(Link, { to: "/account", className: "inline-flex items-center gap-2 rounded-full border border-[#9FF7D3]/40 px-4 py-2 uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:border-[#9FF7D3]/70 hover:text-white", children: "Manage wallet" })] })))] }));
};
export default MarketsPage;
