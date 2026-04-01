import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAdminMarkets } from "@domains/betting/api/marketAdminApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { format, formatDistanceToNow } from "date-fns";
import MarketBuilderWizard from "./MarketBuilderWizard";
const FILTERS = [
    { key: "active", label: "Active", statuses: ["active"] },
    { key: "upcoming", label: "Upcoming", statuses: ["draft", "upcoming"] },
    { key: "settlement", label: "In Settlement", statuses: ["in_settlement"] },
    { key: "settled", label: "Settled", statuses: ["settled"] },
    { key: "all", label: "All", statuses: null }
];
const MarketManagementPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState("active");
    const [wizardOpen, setWizardOpen] = useState(false);
    const marketsQuery = useQuery({
        queryKey: ["admin-markets"],
        queryFn: fetchAdminMarkets
    });
    const filteredMarkets = useMemo(() => {
        if (!marketsQuery.data)
            return [];
        const filterConfig = FILTERS.find((item) => item.key === filter)?.statuses;
        if (!filterConfig)
            return marketsQuery.data;
        return marketsQuery.data.filter((market) => filterConfig.includes(market.status));
    }, [marketsQuery.data, filter]);
    const summary = useMemo(() => {
        const markets = marketsQuery.data ?? [];
        return {
            total: markets.length,
            external: markets.filter((market) => market.source_type === "external_feed").length,
            manual: markets.filter((market) => market.source_type === "manual_timing").length,
            review: markets.filter((market) => market.source_type === "external_feed" && market.status !== "active").length
        };
    }, [marketsQuery.data]);
    const handleWizardSuccess = () => {
        toast({
            variant: "success",
            title: "Market created",
            description: "Market Builder saved pools and runners."
        });
        setWizardOpen(false);
        queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
    };
    return (_jsxs("div", { className: "space-y-10", children: [_jsxs("header", { className: "grid gap-8 border-b border-white/8 pb-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-[0.65rem] uppercase tracking-[0.28em] text-white/45", children: "Market Ops" }), _jsxs("div", { className: "space-y-3", children: [_jsx("h1", { className: "text-3xl font-semibold text-white sm:text-4xl", children: "Market Management" }), _jsx("p", { className: "max-w-3xl text-sm leading-7 text-white/60", children: "Manual session slates and external-feed boards now share one calm surface. Source context comes first, dense badges are gone, and the page leaves space where scanning is faster than decoration." })] }), _jsxs("div", { className: "grid gap-6 pt-3 sm:grid-cols-4", children: [_jsx(Stat, { label: "Visible Slates", value: String(summary.total) }), _jsx(Stat, { label: "External Feed", value: String(summary.external) }), _jsx(Stat, { label: "Manual Builds", value: String(summary.manual) }), _jsx(Stat, { label: "Needs Review", value: String(summary.review) })] })] }), _jsx("button", { type: "button", className: "min-h-[3rem] rounded-full bg-brand px-6 text-sm font-semibold uppercase tracking-[0.24em] text-black transition hover:bg-brand/90", onClick: () => setWizardOpen(true), children: "New Market" })] }), _jsx("nav", { className: "flex flex-wrap gap-6 border-b border-white/8 pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/45", children: FILTERS.map((item) => (_jsx("button", { className: `border-b pb-3 transition ${filter === item.key ? "border-white text-white" : "border-transparent hover:text-white/70"}`, onClick: () => setFilter(item.key), children: item.label }, item.key))) }), marketsQuery.isLoading && _jsx("p", { className: "text-white/60", children: "Loading markets\u2026" }), marketsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load markets. Refresh to try again." })), _jsxs("section", { className: "grid gap-6", children: [filteredMarkets.map((market) => (_jsx(MarketCard, { market: market }, market.id))), !marketsQuery.isLoading && filteredMarkets.length === 0 && (_jsx("div", { className: "rounded-[2rem] border border-white/8 bg-white/[0.02] px-8 py-12 text-sm text-white/55", children: "No markets match this filter." }))] }), wizardOpen && _jsx(MarketBuilderWizard, { onClose: () => setWizardOpen(false), onSuccess: handleWizardSuccess })] }));
};
const Stat = ({ label, value }) => (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-[0.65rem] uppercase tracking-[0.22em] text-white/35", children: label }), _jsx("p", { className: "text-2xl font-semibold text-white", children: value })] }));
const MarketCard = ({ market }) => {
    const handle = market.markets.reduce((sum, pool) => sum + pool.total_pool, 0);
    const openPools = market.markets.filter((pool) => pool.status === "open").length;
    const totalPools = market.markets.length;
    const sourceLabel = market.source_type === "external_feed" ? "External Feed" : "Manual Session";
    const sourceDescription = market.source_type === "external_feed"
        ? [market.sport_code?.toUpperCase(), market.competition?.name, market.sports_event?.venue_name].filter(Boolean).join(" • ")
        : [market.session?.name, market.session?.track_name].filter(Boolean).join(" • ") || "Custom market slate";
    const detailLine = [
        market.sports_event?.round_label,
        market.external_status ? `feed ${market.external_status}` : null,
        `${totalPools} pool${totalPools === 1 ? "" : "s"}`
    ]
        .filter(Boolean)
        .join(" • ");
    const poolPreview = market.markets.slice(0, 3).map((pool) => pool.label || pool.name).join(", ");
    const statusCopy = market.status === "active"
        ? "Taking bets"
        : market.status === "in_settlement"
            ? "Awaiting settlement"
            : market.status === "settled"
                ? "Settled"
                : market.status === "upcoming"
                    ? "Queued for open"
                    : "In draft";
    return (_jsx("article", { className: "rounded-[2rem] border border-white/8 bg-white/[0.02] p-7", children: _jsxs("div", { className: "grid gap-8 xl:grid-cols-[minmax(0,1fr)_15rem]", children: [_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-[0.68rem] uppercase tracking-[0.24em] text-white/38", children: sourceLabel }), _jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-2xl font-semibold text-white", children: market.title }), _jsx("p", { className: "text-sm text-white/52", children: sourceDescription })] }), market.description ? _jsx("p", { className: "max-w-3xl text-sm leading-7 text-white/62", children: market.description }) : null] }), _jsxs("div", { className: "grid gap-4 border-t border-white/8 pt-5 sm:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-[0.65rem] uppercase tracking-[0.22em] text-white/35", children: "Slate Status" }), _jsx("p", { className: "text-base text-white", children: statusCopy }), _jsx("p", { className: "text-sm text-white/45", children: detailLine })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-[0.65rem] uppercase tracking-[0.22em] text-white/35", children: "Pools" }), _jsx("p", { className: "text-base text-white", children: poolPreview || "No pools seeded yet" }), _jsxs("p", { className: "text-sm text-white/45", children: ["Takeout ", (market.takeout * 100).toFixed(1), "% \u2022 ", openPools, " currently open"] })] })] })] }), _jsxs("div", { className: "space-y-6 xl:text-right", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-[0.65rem] uppercase tracking-[0.22em] text-white/35", children: "Handle" }), _jsx("p", { className: "text-3xl font-semibold text-white", children: `${currencySymbol}${handle.toLocaleString()}` }), _jsxs("p", { className: "text-sm text-white/45", children: [openPools, " / ", totalPools, " pools open"] })] }), market.starts_at ? (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-[0.65rem] uppercase tracking-[0.22em] text-white/35", children: "Start Window" }), _jsx("p", { className: "text-base text-white", children: formatDistanceToNow(new Date(market.starts_at), { addSuffix: true }) }), _jsx("p", { className: "text-sm text-white/45", children: format(new Date(market.starts_at), "EEE d MMM • h:mm a") })] })) : null, _jsx("div", { className: "pt-2", children: _jsx(Link, { to: `/dashboard/admin/markets/${market.id}`, className: "text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-brand transition hover:text-white", children: "Open Slate" }) })] })] }) }));
};
export default MarketManagementPage;
