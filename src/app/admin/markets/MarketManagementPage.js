import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAdminMarkets } from "@domains/betting/api/marketAdminApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { formatDistanceToNow } from "date-fns";
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
        const filterConfig = FILTERS.find((f) => f.key === filter)?.statuses;
        if (!filterConfig)
            return marketsQuery.data;
        return marketsQuery.data.filter((market) => filterConfig.includes(market.status));
    }, [marketsQuery.data, filter]);
    const handleWizardSuccess = () => {
        toast({
            variant: "success",
            title: "Market created",
            description: "Market Builder saved pools and runners."
        });
        setWizardOpen(false);
        queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
    };
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Market Ops" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Market Management" }), _jsx("p", { className: "text-sm text-white/60", children: "Create betting slates, monitor pools, and step through settlements." })] }), _jsx("button", { type: "button", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-black hover:bg-brand/90", onClick: () => setWizardOpen(true), children: "+ New Market" })] }), _jsx("nav", { className: "flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50", children: FILTERS.map((item) => (_jsx("button", { className: `rounded-full px-4 py-2 transition ${filter === item.key ? "bg-white text-black" : "border border-white/10 text-white/60"}`, onClick: () => setFilter(item.key), children: item.label }, item.key))) }), marketsQuery.isLoading && _jsx("p", { className: "text-white/60", children: "Loading markets\u2026" }), marketsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load markets. Refresh to try again." })), _jsxs("section", { className: "grid gap-4", children: [filteredMarkets.map((market) => (_jsx(MarketCard, { market: market }, market.id))), !marketsQuery.isLoading && filteredMarkets.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No markets match this filter." }))] }), wizardOpen && (_jsx(MarketBuilderWizard, { onClose: () => setWizardOpen(false), onSuccess: handleWizardSuccess }))] }));
};
const MarketCard = ({ market }) => {
    const handle = market.markets.reduce((sum, pool) => sum + pool.total_pool, 0);
    const openPools = market.markets.filter((pool) => pool.status === "open").length;
    const totalPools = market.markets.length;
    return (_jsxs("article", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: market.status }), _jsx("h2", { className: "text-2xl font-semibold text-white", children: market.title }), _jsxs("p", { className: "text-sm text-white/60", children: [market.session?.name ?? "Unlinked session", market.session?.track_name ? ` • ${market.session.track_name}` : ""] }), _jsxs("p", { className: "text-xs text-white/50", children: [market.market_type, " \u2022 ", market.scope] }), market.starts_at && (_jsxs("p", { className: "text-xs text-white/40", children: ["Starts ", formatDistanceToNow(new Date(market.starts_at), { addSuffix: true })] }))] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Handle" }), _jsx("p", { className: "text-2xl font-semibold", children: `${currencySymbol}${handle.toLocaleString()}` }), _jsxs("p", { className: "text-xs text-white/60", children: [openPools, " / ", totalPools, " pools open"] })] })] }), _jsxs("footer", { className: "mt-4 flex flex-wrap items-center justify-between gap-3 text-sm", children: [_jsxs("div", { className: "flex gap-2 text-white/60", children: [_jsxs("span", { children: ["Takeout ", (market.takeout * 100).toFixed(1), "%"] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: [totalPools, " pools"] })] }), _jsx(Link, { to: `/dashboard/admin/markets/${market.id}`, className: "text-xs font-semibold uppercase tracking-[0.3em] text-brand hover:text-white", children: "Manage \u2192" })] })] }));
};
export default MarketManagementPage;
