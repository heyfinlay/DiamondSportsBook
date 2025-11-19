import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { closePool, confirmSettlement, fetchAdminMarketDetail, fetchMarketWagers, fetchWalletActivityForMarket, fetchRakeLedger, openPool, previewSettlement, proposeSettlement, suspendPool, voidPool, archivePool, restorePool } from "@domains/betting/api/marketAdminApi";
import { useToast } from "@app/components/ToastProvider";
const tabs = [
    { key: "overview", label: "Overview" },
    { key: "pools", label: "Pools" },
    { key: "wallet", label: "Wallet & Money" },
    { key: "participants", label: "Participants / Bets" },
    { key: "audit", label: "Audit / Logs" }
];
const MarketDetailAdminPage = () => {
    const { marketId } = useParams();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("overview");
    const [walletPoolFilter, setWalletPoolFilter] = useState("all");
    const [wagerPoolFilter, setWagerPoolFilter] = useState("all");
    const detailQuery = useQuery({
        queryKey: ["admin-market-detail", marketId],
        queryFn: () => fetchAdminMarketDetail(marketId),
        enabled: !!marketId
    });
    const pools = detailQuery.data?.markets ?? [];
    const wagersQuery = useQuery({
        queryKey: ["admin-market-wagers", marketId, wagerPoolFilter],
        queryFn: () => fetchMarketWagers(marketId, wagerPoolFilter === "all" ? undefined : wagerPoolFilter),
        enabled: !!marketId
    });
    const walletQuery = useQuery({
        queryKey: ["admin-market-wallet", marketId, walletPoolFilter],
        queryFn: () => fetchWalletActivityForMarket(marketId, walletPoolFilter === "all" ? undefined : walletPoolFilter),
        enabled: !!marketId
    });
    const rakeLedgerQuery = useQuery({
        queryKey: ["admin-market-rake", marketId],
        queryFn: () => fetchRakeLedger(marketId),
        enabled: !!marketId
    });
    const totalHandle = pools.reduce((sum, pool) => sum + pool.total_pool, 0);
    const totalWagers = wagersQuery.data?.length ?? 0;
    const pendingWagers = wagersQuery.data?.filter((wager) => wager.status === "accepted" || wager.status === "pending").length ?? 0;
    const totalRake = rakeLedgerQuery.data?.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
    const refreshDetail = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-market-detail", marketId] });
        queryClient.invalidateQueries({ queryKey: ["admin-market-wagers", marketId], exact: false });
        queryClient.invalidateQueries({ queryKey: ["admin-market-wallet", marketId], exact: false });
        queryClient.invalidateQueries({ queryKey: ["admin-market-rake", marketId], exact: false });
    };
    if (!marketId) {
        return _jsx("p", { className: "text-white/70", children: "Market not found." });
    }
    if (detailQuery.isLoading) {
        return _jsx("p", { className: "text-white/60", children: "Loading market detail\u2026" });
    }
    if (detailQuery.isError || !detailQuery.data) {
        return (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load market. Try again later." }));
    }
    const market = detailQuery.data;
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx(Link, { to: "/dashboard/admin/markets", className: "text-xs text-white/60 hover:text-white", children: "\u2190 Back to markets" }), _jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Market" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: market.title }), _jsxs("p", { className: "text-sm text-white/60", children: [market.session?.name ?? "Unlinked session", market.session?.track_name ? ` • ${market.session.track_name}` : ""] })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 px-6 py-4 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Handle" }), _jsxs("p", { className: "text-2xl font-semibold", children: ["\u0189", totalHandle.toLocaleString()] }), _jsxs("p", { className: "text-xs text-white/60", children: ["Status: ", market.status] })] })] }), _jsx("nav", { className: "flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50", children: tabs.map((tab) => (_jsx("button", { className: `rounded-full px-4 py-2 transition ${activeTab === tab.key ? "bg-white text-black" : "border border-white/10 text-white/60"}`, onClick: () => setActiveTab(tab.key), children: tab.label }, tab.key))) }), activeTab === "overview" && (_jsx(OverviewTab, { pools: pools, totalHandle: totalHandle, totalWagers: totalWagers, pendingWagers: pendingWagers, totalRake: totalRake })), activeTab === "pools" && (_jsxs("div", { className: "space-y-4", children: [pools.map((pool) => (_jsx(PoolManager, { pool: pool, onRefresh: refreshDetail }, pool.id))), pools.length === 0 && _jsx("p", { className: "text-sm text-white/60", children: "No pools configured." })] })), activeTab === "wallet" && (_jsx(WalletTab, { pools: pools, walletPoolFilter: walletPoolFilter, setWalletPoolFilter: setWalletPoolFilter, walletRows: walletQuery.data ?? [], totalHandle: totalHandle, pendingWagers: pendingWagers, totalRake: totalRake, isLoading: walletQuery.isLoading })), activeTab === "participants" && (_jsx(ParticipantsTab, { pools: pools, wagers: wagersQuery.data ?? [], isLoading: wagersQuery.isLoading, filter: wagerPoolFilter, setFilter: setWagerPoolFilter })), activeTab === "audit" && (_jsx("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/60", children: "No audit log source configured. Connect admin_actions_log to surface recent operations." }))] }));
};
const OverviewTab = ({ pools, totalHandle, totalWagers, pendingWagers, totalRake }) => {
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsx(KpiCard, { label: "Handle", value: `Ɖ${totalHandle.toLocaleString()}` }), _jsx(KpiCard, { label: "Total Wagers", value: totalWagers.toString() }), _jsx(KpiCard, { label: "Pending Wagers", value: pendingWagers.toString() }), _jsx(KpiCard, { label: "Net Rake", value: `Ɖ${totalRake.toFixed(2)}` })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2", children: pools.map((pool) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-black/30 p-4", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: pool.status }), _jsx("h3", { className: "text-lg font-semibold text-white", children: pool.name })] }), _jsxs("p", { className: "text-sm text-white/60", children: ["\u0189", pool.total_pool.toLocaleString()] })] }), _jsx("p", { className: "mt-2 text-xs text-white/60", children: pool.description }), _jsxs("p", { className: "mt-2 text-xs text-white/40", children: ["Rake ", (pool.rake_percent * 100).toFixed(1), "%"] }), _jsx("a", { href: "#pools", className: "mt-3 inline-block text-xs uppercase tracking-[0.3em] text-brand hover:text-white", children: "Manage pool \u2192" })] }, pool.id))) })] }));
};
const PoolManager = ({ pool, onRefresh }) => {
    const { toast } = useToast();
    const [selectedOutcome, setSelectedOutcome] = useState("");
    const [preview, setPreview] = useState(null);
    const closeMutation = useMutation({
        mutationFn: () => closePool(pool.id),
        onSuccess: () => {
            toast({ variant: "success", title: "Pool closed" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Unable to close", description: error.message })
    });
    const openMutation = useMutation({
        mutationFn: () => openPool(pool.id),
        onSuccess: () => {
            toast({ variant: "success", title: "Pool opened" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Unable to open", description: error.message })
    });
    const suspendMutation = useMutation({
        mutationFn: () => suspendPool(pool.id),
        onSuccess: () => {
            toast({ variant: "success", title: "Pool suspended" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Unable to suspend", description: error.message })
    });
    const previewMutation = useMutation({
        mutationFn: (outcomeId) => previewSettlement(pool.id, outcomeId),
        onSuccess: (data) => setPreview(data),
        onError: (error) => toast({ variant: "error", title: "Preview failed", description: error.message })
    });
    const proposeMutation = useMutation({
        mutationFn: (outcomeId) => proposeSettlement(pool.id, outcomeId),
        onSuccess: () => {
            toast({ variant: "success", title: "Settlement proposed" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Proposal failed", description: error.message })
    });
    const confirmMutation = useMutation({
        mutationFn: () => confirmSettlement(pool.id),
        onSuccess: () => {
            toast({ variant: "success", title: "Pool settled" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Settlement failed", description: error.message })
    });
    const voidMutation = useMutation({
        mutationFn: () => voidPool(pool.id),
        onSuccess: () => {
            toast({ variant: "success", title: "Pool voided" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Unable to void", description: error.message })
    });
    const archiveMutation = useMutation({
        mutationFn: () => archivePool(pool.id),
        onSuccess: () => {
            toast({ variant: "success", title: "Pool archived" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Unable to archive", description: error.message })
    });
    const restoreMutation = useMutation({
        mutationFn: () => restorePool(pool.id),
        onSuccess: () => {
            toast({ variant: "success", title: "Pool restored" });
            onRefresh();
        },
        onError: (error) => toast({ variant: "error", title: "Unable to restore", description: error.message })
    });
    const totalOutcomePool = pool.outcomes.reduce((sum, outcome) => sum + outcome.pool, 0);
    const pendingSummary = pool.pending_settlement?.summary
        ? pool.pending_settlement.summary
        : undefined;
    const previewData = preview ?? pendingSummary ?? null;
    const formatPreviewValue = (value) => {
        const num = typeof value === "number" ? value : Number(value ?? 0);
        return Number.isFinite(num) ? num.toFixed(2) : "0.00";
    };
    return (_jsxs("article", { id: "pools", className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: pool.status }), _jsx("h3", { className: "text-xl font-semibold text-white", children: pool.name }), _jsx("p", { className: "text-sm text-white/60", children: pool.description })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(PoolActionButton, { label: "Open", onClick: () => openMutation.mutate(), disabled: openMutation.isPending }), _jsx(PoolActionButton, { label: "Close", onClick: () => closeMutation.mutate(), disabled: closeMutation.isPending }), _jsx(PoolActionButton, { label: "Suspend", onClick: () => suspendMutation.mutate(), disabled: suspendMutation.isPending }), _jsx(PoolActionButton, { label: "Void", onClick: () => {
                                    const confirmed = window.confirm("Void this pool and refund all wagers?");
                                    if (!confirmed)
                                        return;
                                    voidMutation.mutate();
                                }, disabled: voidMutation.isPending }), pool.status === "settled" || pool.status === "void" ? (_jsx(PoolActionButton, { label: pool.archived ? "Restore" : "Archive", onClick: () => {
                                    if (!pool.archived) {
                                        const confirmed = window.confirm("Archive this pool so it no longer appears on the public board?");
                                        if (!confirmed)
                                            return;
                                        archiveMutation.mutate();
                                    }
                                    else {
                                        restoreMutation.mutate();
                                    }
                                }, disabled: archiveMutation.isPending || restoreMutation.isPending })) : null] })] }), _jsx("div", { className: "mt-4 overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "text-left text-xs uppercase tracking-[0.3em] text-white/50", children: _jsxs("tr", { children: [_jsx("th", { className: "py-2", children: "Outcome" }), _jsx("th", { children: "Stake" }), _jsx("th", { children: "% Pool" }), _jsx("th", { children: "Implied Payout" }), _jsx("th", { children: "Select" })] }) }), _jsx("tbody", { children: pool.outcomes.map((outcome) => {
                                const share = totalOutcomePool > 0 ? (outcome.pool / totalOutcomePool) * 100 : 0;
                                const implied = outcome.pool > 0 ? (pool.total_pool / outcome.pool).toFixed(2) : "—";
                                return (_jsxs("tr", { className: "border-t border-white/5 text-white/80", children: [_jsx("td", { className: "py-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "h-3 w-3 rounded-full", style: { backgroundColor: outcome.color ?? "#9FF7D3" } }), outcome.label] }) }), _jsxs("td", { children: ["\u0189", outcome.pool.toFixed(2)] }), _jsxs("td", { children: [share.toFixed(1), "%"] }), _jsx("td", { children: implied }), _jsx("td", { children: _jsx("input", { type: "radio", name: `outcome-${pool.id}`, checked: selectedOutcome === outcome.id, onChange: () => {
                                                    setSelectedOutcome(outcome.id);
                                                    setPreview(null);
                                                } }) })] }, outcome.id));
                            }) })] }) }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3 text-xs", children: [_jsx("button", { type: "button", className: "rounded-full border border-white/20 px-4 py-2 uppercase tracking-[0.3em]", onClick: () => selectedOutcome && previewMutation.mutate(selectedOutcome), disabled: !selectedOutcome || previewMutation.isPending, children: "Preview Settlement" }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-4 py-2 uppercase tracking-[0.3em]", onClick: () => selectedOutcome && proposeMutation.mutate(selectedOutcome), disabled: !selectedOutcome || proposeMutation.isPending, children: "Propose Settlement" }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-4 py-2 uppercase tracking-[0.3em]", onClick: () => confirmMutation.mutate(), disabled: confirmMutation.isPending || pool.status !== "settlement_proposed", children: "Confirm Settlement" })] }), previewData && (_jsxs("div", { className: "mt-4 rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-white/80", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Settlement Preview" }), _jsxs("p", { children: ["Handle \u0189", formatPreviewValue(previewData.handle)] }), _jsxs("p", { children: ["Rake \u0189", formatPreviewValue(previewData.rake_amount)] }), _jsxs("p", { children: ["Distribution \u0189", formatPreviewValue(previewData.distribution_pool)] })] }))] }));
};
const WalletTab = ({ pools, walletPoolFilter, setWalletPoolFilter, walletRows, totalHandle, pendingWagers, totalRake, isLoading }) => {
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(KpiCard, { label: "Handle", value: `Ɖ${totalHandle.toLocaleString()}` }), _jsx(KpiCard, { label: "Pending Wagers", value: pendingWagers.toString() }), _jsx(KpiCard, { label: "Net Rake", value: `Ɖ${totalRake.toFixed(2)}` })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Pool Filter" }), _jsxs("select", { value: walletPoolFilter, onChange: (event) => setWalletPoolFilter(event.target.value), className: "rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-sm", children: [_jsx("option", { value: "all", children: "All pools" }), pools.map((pool) => (_jsx("option", { value: pool.id, children: pool.name }, pool.id)))] })] }), isLoading ? (_jsx("p", { className: "mt-4 text-sm text-white/60", children: "Loading wallet activity\u2026" })) : (_jsxs("div", { className: "mt-4 space-y-3", children: [walletRows.length === 0 && _jsx("p", { className: "text-sm text-white/60", children: "No wallet activity yet." }), walletRows.map((row) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm", children: [_jsx("p", { className: "font-semibold", children: row.kind }), _jsxs("p", { className: "text-xs text-white/60", children: ["User ", row.user_id.slice(0, 8), "\u2026"] }), _jsxs("p", { className: "text-lg font-semibold", children: [row.amount >= 0 ? "+" : "", "\u0189", row.amount.toFixed(2)] })] }, row.id)))] }))] })] }));
};
const ParticipantsTab = ({ pools, wagers, isLoading, filter, setFilter }) => {
    return (_jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Pool Filter" }), _jsxs("select", { value: filter, onChange: (event) => setFilter(event.target.value), className: "rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-sm", children: [_jsx("option", { value: "all", children: "All pools" }), pools.map((pool) => (_jsx("option", { value: pool.id, children: pool.name }, pool.id)))] })] }), isLoading ? (_jsx("p", { className: "mt-4 text-sm text-white/60", children: "Loading wagers\u2026" })) : (_jsx("div", { className: "mt-4 overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "text-left text-xs uppercase tracking-[0.3em] text-white/50", children: _jsxs("tr", { children: [_jsx("th", { className: "py-2", children: "User" }), _jsx("th", { children: "Pool" }), _jsx("th", { children: "Outcome" }), _jsx("th", { children: "Stake" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" })] }) }), _jsxs("tbody", { children: [wagers.map((wager) => (_jsxs("tr", { className: "border-t border-white/5 text-white/80", children: [_jsx("td", { className: "py-2", children: wager.user_name ?? wager.user_id.slice(0, 8) }), _jsx("td", { children: wager.pool_name }), _jsx("td", { children: wager.outcome_label }), _jsxs("td", { children: ["\u0189", wager.stake.toFixed(2)] }), _jsx("td", { children: wager.status }), _jsx("td", { children: new Date(wager.created_at).toLocaleString() })] }, wager.wager_id))), wagers.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "py-4 text-center text-white/60", children: "No wagers yet." }) }))] })] }) }))] }));
};
const KpiCard = ({ label, value }) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/40 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: label }), _jsx("p", { className: "text-2xl font-semibold text-white", children: value })] }));
const PoolActionButton = ({ label, onClick, disabled }) => (_jsx("button", { type: "button", onClick: onClick, disabled: disabled, className: "rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white disabled:opacity-40", children: label }));
export default MarketDetailAdminPage;
