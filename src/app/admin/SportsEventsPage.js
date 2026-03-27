import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Radio, RefreshCw } from "lucide-react";
import { fetchSportsBoardEvents, publishSportsEvent, triggerSportsSync, unpublishSportsEvent } from "@domains/sports/api/sportsDataApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { sportsKeys } from "@lib/query/keys";
import { getSportLabel } from "@domains/sports/utils/sportsUi";
const sportFilters = [
    { key: "all", label: "All" },
    { key: "f1", label: "Formula 1" },
    { key: "nrl", label: "NRL" },
    { key: "afl", label: "AFL" },
    { key: "mma", label: "MMA" },
    { key: "soccer", label: "Soccer" }
];
const SportsEventsPage = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [sportFilter, setSportFilter] = useState("all");
    const eventsQuery = useQuery({
        queryKey: sportsKeys.adminBoard(sportFilter === "all" ? null : sportFilter),
        queryFn: () => fetchSportsBoardEvents({
            limit: 48,
            sportCode: sportFilter === "all" ? null : sportFilter,
            includeUnpublished: true
        })
    });
    const syncMutation = useMutation({
        mutationFn: triggerSportsSync,
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Sync completed",
                description: "Provider data and generated event boards were refreshed."
            });
            queryClient.invalidateQueries({ queryKey: sportsKeys.providerHealth() });
            queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
            queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Sync failed",
                description: error.message
            });
        }
    });
    const publishMutation = useMutation({
        mutationFn: publishSportsEvent,
        onSuccess: (_, eventId) => {
            toast({
                variant: "success",
                title: "Event published",
                description: "Generated markets are now live on the public board."
            });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "admin") });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "public") });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Publish failed",
                description: error.message
            });
        }
    });
    const unpublishMutation = useMutation({
        mutationFn: unpublishSportsEvent,
        onSuccess: (_, eventId) => {
            toast({
                variant: "success",
                title: "Event pulled from public board",
                description: "Markets were returned to admin review."
            });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "admin") });
            void queryClient.invalidateQueries({ queryKey: sportsKeys.event(eventId, "public") });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Unable to unpublish event",
                description: error.message
            });
        }
    });
    const events = eventsQuery.data ?? [];
    const publishedCount = events.filter((event) => event.published).length;
    const draftCount = events.length - publishedCount;
    const totalPools = events.reduce((sum, event) => sum + event.markets.length, 0);
    const totalLiquidity = events.reduce((sum, event) => sum + event.markets.reduce((marketSum, market) => marketSum + market.totalPool, 0), 0);
    const reviewQueue = useMemo(() => [...events].sort((a, b) => Number(a.published) - Number(b.published)), [events]);
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Admin Review" }), _jsx("h1", { className: "mt-3 font-headline text-4xl font-black uppercase tracking-tight text-white", children: "External Event Review" }), _jsx("p", { className: "mt-4 max-w-3xl text-sm leading-7 text-on-subtle", children: "Review auto-generated sports events, confirm the generated pools, and publish only the boards that should be visible to users." })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", onClick: () => syncMutation.mutate({ mode: "schedule", sports: ["f1", "nrl"] }), disabled: syncMutation.isPending, children: [_jsx(RefreshCw, { className: `h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}` }), "Refresh Schedule"] }), _jsxs("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", onClick: () => syncMutation.mutate({ mode: "live", sports: ["f1", "nrl"] }), disabled: syncMutation.isPending, children: [_jsx(Radio, { className: "h-3.5 w-3.5" }), "Refresh Live Data"] }), _jsx(Link, { to: "/admin", className: "prismatic-button prismatic-button-primary min-h-[2.35rem] px-4 text-[0.62rem]", children: "Back To Ops" })] })] }), _jsxs("section", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(MetricCard, { label: "Published", value: String(publishedCount) }), _jsx(MetricCard, { label: "In Review", value: String(draftCount) }), _jsx(MetricCard, { label: "Generated Pools", value: String(totalPools) }), _jsx(MetricCard, { label: "Visible Liquidity", value: `${currencySymbol}${totalLiquidity.toFixed(0)}` })] }), _jsx("section", { className: "flex flex-wrap gap-2", children: sportFilters.map((filter) => (_jsx("button", { type: "button", onClick: () => setSportFilter(filter.key), className: "prismatic-chip", "data-active": sportFilter === filter.key, children: filter.label }, filter.key))) }), _jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10 overflow-x-auto", children: [_jsxs("table", { className: "prismatic-table min-w-full", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 text-left", children: "Event" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Sport" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Starts" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Pools" }), _jsx("th", { className: "px-6 py-4 text-left", children: "State" }), _jsx("th", { className: "px-6 py-4 text-right", children: "Actions" })] }) }), _jsx("tbody", { children: reviewQueue.map((event) => {
                                        const liquidity = event.markets.reduce((sum, market) => sum + market.totalPool, 0);
                                        return (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-5", children: _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: event.title }), _jsx("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: event.sportsEvent?.competition?.name ?? event.sportsEvent?.venueName ?? "External feed" })] }) }), _jsx("td", { className: "px-6 py-5 text-sm text-on-subtle", children: getSportLabel(event.sportCode) }), _jsx("td", { className: "px-6 py-5 text-sm text-on-subtle", children: event.startsAt ? new Date(event.startsAt).toLocaleString() : "TBD" }), _jsx("td", { className: "px-6 py-5", children: _jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-sm font-semibold text-white", children: [event.markets.length, " pools"] }), _jsxs("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [currencySymbol, liquidity.toFixed(0)] }), event.markets.slice(0, 2).map((market) => (_jsx("p", { className: "text-[0.68rem] text-on-subtle", children: market.name }, market.id)))] }) }), _jsx("td", { className: "px-6 py-5", children: _jsx("span", { className: `inline-flex border px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] ${event.published
                                                            ? "border-primary-container/25 bg-primary-container/10 text-primary-dim"
                                                            : "border-white/10 bg-white/5 text-on-subtle"}`, children: event.published ? "Live" : "Review" }) }), _jsx("td", { className: "px-6 py-5", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsxs(Link, { to: `/events/${event.id}`, className: "prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]", children: [_jsx(Eye, { className: "h-3.5 w-3.5" }), "Preview"] }), event.published ? (_jsx("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]", onClick: () => unpublishMutation.mutate(event.id), disabled: unpublishMutation.isPending, children: "Pull Live" })) : (_jsx("button", { type: "button", className: "prismatic-button prismatic-button-primary min-h-[2.2rem] px-3 text-[0.58rem]", onClick: () => publishMutation.mutate(event.id), disabled: publishMutation.isPending, children: "Publish" }))] }) })] }, event.id));
                                    }) })] }), !eventsQuery.isLoading && reviewQueue.length === 0 ? (_jsx("p", { className: "px-6 py-8 text-sm text-on-subtle", children: "No synced external events are available yet for this sport filter." })) : null] }) })] }));
};
const MetricCard = ({ label, value }) => (_jsxs("div", { className: "border-l-2 border-primary-container bg-surface-low/85 px-5 py-5", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle", children: label }), _jsx("p", { className: "mt-3 font-headline text-4xl font-black text-white", children: value })] }));
export default SportsEventsPage;
