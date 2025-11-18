import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createMarketWizard, fetchAdminMarkets } from "@domains/betting/api/marketAdminApi";
import { fetchSessions } from "@domains/timing/api/timingApi";
import { useToast } from "@app/components/ToastProvider";
import { formatDistanceToNow } from "date-fns";
const FILTERS = [
    { key: "active", label: "Active", statuses: ["active"] },
    { key: "upcoming", label: "Upcoming", statuses: ["draft", "upcoming"] },
    { key: "settlement", label: "In Settlement", statuses: ["in_settlement"] },
    { key: "settled", label: "Settled", statuses: ["settled"] },
    { key: "all", label: "All", statuses: null }
];
const defaultPoolDraft = () => ({
    id: crypto.randomUUID(),
    name: "Overall Winner",
    description: "",
    pool_type: "winner",
    rake_percent: 0.12,
    min_stake: 10,
    max_stake: 1000,
    close_time: ""
});
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
            description: "Pools were seeded using the session drivers."
        });
        setWizardOpen(false);
        queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
    };
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Market Ops" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Market Management" }), _jsx("p", { className: "text-sm text-white/60", children: "Create betting slates, monitor pools, and step through settlements." })] }), _jsx("button", { type: "button", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-black hover:bg-brand/90", onClick: () => setWizardOpen(true), children: "+ New Market" })] }), _jsx("nav", { className: "flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50", children: FILTERS.map((item) => (_jsx("button", { className: `rounded-full px-4 py-2 transition ${filter === item.key ? "bg-white text-black" : "border border-white/10 text-white/60"}`, onClick: () => setFilter(item.key), children: item.label }, item.key))) }), marketsQuery.isLoading && _jsx("p", { className: "text-white/60", children: "Loading markets\u2026" }), marketsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: "Unable to load markets. Refresh to try again." })), _jsxs("section", { className: "grid gap-4", children: [filteredMarkets.map((market) => (_jsx(MarketCard, { market: market }, market.id))), !marketsQuery.isLoading && filteredMarkets.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No markets match this filter." }))] }), wizardOpen && (_jsx(MarketWizard, { onClose: () => setWizardOpen(false), onSuccess: handleWizardSuccess }))] }));
};
const MarketCard = ({ market }) => {
    const handle = market.markets.reduce((sum, pool) => sum + pool.total_pool, 0);
    const openPools = market.markets.filter((pool) => pool.status === "open").length;
    const totalPools = market.markets.length;
    return (_jsxs("article", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: market.status }), _jsx("h2", { className: "text-2xl font-semibold text-white", children: market.title }), _jsxs("p", { className: "text-sm text-white/60", children: [market.session?.name ?? "Unlinked session", market.session?.track_name ? ` • ${market.session.track_name}` : ""] }), market.starts_at && (_jsxs("p", { className: "text-xs text-white/40", children: ["Starts ", formatDistanceToNow(new Date(market.starts_at), { addSuffix: true })] }))] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Handle" }), _jsxs("p", { className: "text-2xl font-semibold", children: ["\u0189", handle.toLocaleString()] }), _jsxs("p", { className: "text-xs text-white/60", children: [openPools, " / ", totalPools, " pools open"] })] })] }), _jsxs("footer", { className: "mt-4 flex flex-wrap items-center justify-between gap-3 text-sm", children: [_jsxs("div", { className: "flex gap-2 text-white/60", children: [_jsxs("span", { children: ["Takeout ", (market.takeout * 100).toFixed(1), "%"] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: [totalPools, " pools"] })] }), _jsx(Link, { to: `/dashboard/admin/markets/${market.id}`, className: "text-xs font-semibold uppercase tracking-[0.3em] text-brand hover:text-white", children: "Manage \u2192" })] })] }));
};
const MarketWizard = ({ onClose, onSuccess }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const sessionsQuery = useQuery({ queryKey: ["timing-sessions"], queryFn: fetchSessions });
    const [sessionId, setSessionId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [takeout, setTakeout] = useState("0.12");
    const [startsAt, setStartsAt] = useState("");
    const [pools, setPools] = useState([defaultPoolDraft()]);
    const mutation = useMutation({
        mutationFn: (payload) => createMarketWizard(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
            onSuccess();
        },
        onError: (error) => {
            toast({ variant: "error", title: "Unable to create market", description: error.message });
        }
    });
    const selectedSession = sessionsQuery.data?.find((s) => s.id === sessionId);
    const handlePoolUpdate = (id, field, value) => {
        setPools((current) => current.map((pool) => (pool.id === id ? { ...pool, [field]: value } : pool)));
    };
    const handleSubmit = () => {
        if (!sessionId) {
            toast({ variant: "error", title: "Select a session", description: "Choose a timing session to link." });
            return;
        }
        if (!title.trim()) {
            toast({ variant: "error", title: "Title required", description: "Name the market container." });
            return;
        }
        if (pools.some((pool) => !pool.name.trim())) {
            toast({ variant: "error", title: "Pool name missing", description: "Every pool needs a label." });
            return;
        }
        const payload = {
            sessionId,
            title,
            description,
            takeout: takeout ? Number(takeout) : undefined,
            startsAt: startsAt || undefined,
            pools: pools.map((pool) => ({
                name: pool.name,
                description: pool.description,
                pool_type: pool.pool_type,
                rake_percent: pool.rake_percent,
                min_stake: pool.min_stake,
                max_stake: pool.max_stake,
                close_time: pool.close_time || undefined
            }))
        };
        mutation.mutate(payload);
    };
    return (_jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4", children: _jsxs("div", { className: "max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#04060C] p-6", children: [_jsxs("header", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "New Market" }), _jsx("h2", { className: "text-2xl font-semibold text-white", children: "Creation Wizard" }), _jsx("p", { className: "text-sm text-white/60", children: "Select a live session, configure pools, and auto-seed driver outcomes." })] }), _jsx("button", { className: "text-white/60 hover:text-white", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "mt-6 space-y-6", children: [_jsxs("section", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Link Session" }), _jsxs("select", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm", value: sessionId, onChange: (event) => {
                                        setSessionId(event.target.value);
                                        if (!title && event.target.value) {
                                            const session = sessionsQuery.data?.find((s) => s.id === event.target.value);
                                            if (session) {
                                                setTitle(`${session.name} Market`);
                                            }
                                        }
                                    }, children: [_jsx("option", { value: "", children: "Select session\u2026" }), sessionsQuery.data?.map((session) => (_jsxs("option", { value: session.id, children: [session.name, " \u00B7 ", session.mode ?? "race"] }, session.id)))] }), selectedSession && (_jsxs("p", { className: "mt-2 text-xs text-white/50", children: ["Track: ", selectedSession.track_name ?? "TBC", " \u00B7 Starts ", selectedSession.starts_at ?? "TBC"] }))] }), _jsxs("section", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Market Title" }), _jsx("input", { type: "text", value: title, onChange: (event) => setTitle(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", placeholder: "Qualifier Slate" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Takeout %" }), _jsx("input", { type: "number", step: "0.01", value: takeout, onChange: (event) => setTakeout(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Start Time" }), _jsx("input", { type: "datetime-local", value: startsAt, onChange: (event) => setStartsAt(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3" })] })] }), _jsxs("section", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Description" }), _jsx("textarea", { value: description, onChange: (event) => setDescription(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", placeholder: "Oversee overall winner, fastest qualifier, fastest lap pools" })] }), _jsxs("section", { className: "rounded-2xl border border-white/10 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Pools" }), _jsx("button", { type: "button", onClick: () => setPools((current) => [...current, defaultPoolDraft()]), className: "text-xs uppercase tracking-[0.3em] text-brand hover:text-white", children: "+ Add Pool" })] }), _jsx("div", { className: "mt-4 space-y-4", children: pools.map((pool) => (_jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsx("input", { type: "text", value: pool.name, onChange: (event) => handlePoolUpdate(pool.id, "name", event.target.value), className: "flex-1 rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-sm", placeholder: "Pool name" }), pools.length > 1 && (_jsx("button", { type: "button", className: "text-xs uppercase tracking-[0.3em] text-red-400", onClick: () => setPools((current) => current.filter((p) => p.id !== pool.id)), children: "Remove" }))] }), _jsx("textarea", { value: pool.description, onChange: (event) => handlePoolUpdate(pool.id, "description", event.target.value), className: "mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-xs", placeholder: "Pool description" }), _jsxs("div", { className: "mt-3 grid gap-3 md:grid-cols-3", children: [_jsxs("label", { className: "text-xs text-white/50", children: ["Pool Type", _jsx("input", { type: "text", value: pool.pool_type, onChange: (event) => handlePoolUpdate(pool.id, "pool_type", event.target.value), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] }), _jsxs("label", { className: "text-xs text-white/50", children: ["Rake %", _jsx("input", { type: "number", step: "0.01", value: pool.rake_percent, onChange: (event) => handlePoolUpdate(pool.id, "rake_percent", Number(event.target.value)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] }), _jsxs("label", { className: "text-xs text-white/50", children: ["Close Time (ISO)", _jsx("input", { type: "datetime-local", value: pool.close_time, onChange: (event) => handlePoolUpdate(pool.id, "close_time", event.target.value), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] })] }), _jsxs("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs text-white/50", children: ["Min Stake", _jsx("input", { type: "number", value: pool.min_stake, onChange: (event) => handlePoolUpdate(pool.id, "min_stake", Number(event.target.value)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] }), _jsxs("label", { className: "text-xs text-white/50", children: ["Max Stake", _jsx("input", { type: "number", value: pool.max_stake, onChange: (event) => handlePoolUpdate(pool.id, "max_stake", Number(event.target.value)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] })] })] }, pool.id))) })] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.3em] text-white/60", onClick: onClose, children: "Cancel" }), _jsx("button", { type: "button", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black", onClick: handleSubmit, disabled: mutation.isPending, children: mutation.isPending ? "Creating…" : "Create Market" })] })] })] }) }));
};
export default MarketManagementPage;
