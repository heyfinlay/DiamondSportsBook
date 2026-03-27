import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Radio, RefreshCw } from "lucide-react";
import { approveDeposit, approveWithdrawal, fetchAllWalletTransactions, fetchPendingDeposits, fetchPendingWithdrawals, rejectWithdrawal } from "@domains/wallet/api/walletApi";
import { fetchSportsBoardEvents, fetchSportsProviderHealth, triggerSportsSync } from "@domains/sports/api/sportsDataApi";
import { useSession } from "@lib/auth/SessionProvider";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { sportsKeys } from "@lib/query/keys";
import { getSportLabel } from "@domains/sports/utils/sportsUi";
const AdminDashboard = () => {
    const queryClient = useQueryClient();
    const { user } = useSession();
    const { toast } = useToast();
    const depositsQuery = useQuery({
        queryKey: ["admin-pending-deposits"],
        queryFn: fetchPendingDeposits
    });
    const withdrawalsQuery = useQuery({
        queryKey: ["admin-pending-withdrawals"],
        queryFn: fetchPendingWithdrawals
    });
    const walletAuditQuery = useQuery({
        queryKey: ["admin-wallet-audit"],
        queryFn: () => fetchAllWalletTransactions(20)
    });
    const feedHealthQuery = useQuery({
        queryKey: sportsKeys.providerHealth(),
        queryFn: fetchSportsProviderHealth
    });
    const boardEventsQuery = useQuery({
        queryKey: sportsKeys.adminBoard(),
        queryFn: () => fetchSportsBoardEvents({ limit: 12, includeUnpublished: true })
    });
    const approveDepositMutation = useMutation({
        mutationFn: approveDeposit,
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Deposit approved",
                description: "User wallet has been credited."
            });
            queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Unable to approve deposit",
                description: error.message
            });
        }
    });
    const approveWithdrawalMutation = useMutation({
        mutationFn: approveWithdrawal,
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Withdrawal approved",
                description: "Funds marked as processed."
            });
            queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Unable to approve withdrawal",
                description: error.message
            });
        }
    });
    const rejectWithdrawalMutation = useMutation({
        mutationFn: ({ id, reason }) => rejectWithdrawal(id, reason),
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Withdrawal rejected",
                description: "User has been notified and funds were returned."
            });
            queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Unable to reject withdrawal",
                description: error.message
            });
        }
    });
    const syncSportsMutation = useMutation({
        mutationFn: triggerSportsSync,
        onSuccess: (result) => {
            toast({
                variant: "success",
                title: "Sports sync completed",
                description: `${result.requestCount} provider calls used in this run.`
            });
            queryClient.invalidateQueries({ queryKey: sportsKeys.providerHealth() });
            queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
            queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Sports sync failed",
                description: error.message
            });
        }
    });
    const feedHealth = feedHealthQuery.data ?? [];
    const boardEvents = boardEventsQuery.data ?? [];
    const walletAudit = walletAuditQuery.data ?? [];
    const publishedEvents = boardEvents.filter((event) => event.published).length;
    const reviewEvents = boardEvents.filter((event) => !event.published).length;
    const totalLiquidity = boardEvents.reduce((sum, event) => sum + event.markets.reduce((marketSum, market) => marketSum + market.totalPool, 0), 0);
    const activePools = boardEvents.reduce((sum, event) => sum + event.markets.filter((market) => market.status === "open").length, 0);
    const alerts = useMemo(() => {
        const items = [];
        feedHealth.forEach((row) => {
            if (row.status === "failed" || row.error_message) {
                items.push(`${row.display_name} ${row.sport_code ? `• ${row.sport_code.toUpperCase()}` : ""} ${row.error_message ?? "Sync failed"}`);
            }
            if (row.status === "rate_limited") {
                items.push(`${row.display_name} rate limit pressure detected`);
            }
        });
        return items.slice(0, 3);
    }, [feedHealth]);
    if (!user) {
        return (_jsx("div", { className: "prismatic-card p-8 text-center text-on-subtle", children: "Sign in with an admin account to access operations." }));
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Operations Command" }), _jsx("h1", { className: "mt-3 font-headline text-4xl font-black uppercase tracking-tight text-white", children: "Sportsbook Control" }), _jsx("p", { className: "mt-4 max-w-3xl text-sm leading-7 text-on-subtle", children: "Monitor external sports feeds, auto-generated markets, settlement readiness, and wallet approval flow from one operational surface." })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", onClick: () => syncSportsMutation.mutate({ mode: "schedule", sports: ["f1", "nrl"] }), disabled: syncSportsMutation.isPending, children: [_jsx(RefreshCw, { className: `h-3.5 w-3.5 ${syncSportsMutation.isPending ? "animate-spin" : ""}` }), "Sync F1 + NRL"] }), _jsxs("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", onClick: () => syncSportsMutation.mutate({ mode: "live", sports: ["f1", "nrl"] }), disabled: syncSportsMutation.isPending, children: [_jsx(Radio, { className: "h-3.5 w-3.5" }), "Sync Live F1 + NRL"] }), _jsx(Link, { to: "/admin/settlements", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", children: "Settlement Audit" }), _jsx(Link, { to: "/admin/sports", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", children: "Event Review" }), _jsx(Link, { to: "/admin/wallets", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", children: "Wallet Control" }), _jsx(Link, { to: "/dashboard/admin/markets", className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]", children: "Market Management" }), _jsx(Link, { to: "/admin/session-setup", className: "prismatic-button prismatic-button-primary min-h-[2.35rem] px-4 text-[0.62rem]", children: "Create Session" })] })] }), _jsxs("section", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(MetricCard, { label: "Global Liquidity", value: `${currencySymbol}${totalLiquidity.toFixed(0)}`, accent: "text-primary-container" }), _jsx(MetricCard, { label: "Active Pools", value: String(activePools), accent: "text-primary-fixed" }), _jsx(MetricCard, { label: "Review Queue", value: `${reviewEvents}/${boardEvents.length || 1}`, accent: "text-cyan-300" }), _jsx(MetricCard, { label: "Tx Throughput", value: walletAudit.length ? "Stable" : "Idle", accent: "text-white" })] }), _jsxs("section", { className: "grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)]", children: [_jsx("div", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Feed Health" }), _jsx("h2", { className: "mt-2 font-headline text-2xl font-black uppercase tracking-tight text-white", children: "Provider Status" })] }), _jsx("span", { className: "border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] uppercase tracking-[0.18em] text-primary-container", children: syncSportsMutation.isPending ? "Syncing" : "Operational" })] }), _jsxs("div", { className: "mt-6 space-y-4", children: [syncSportsMutation.isPending ? (_jsx("div", { className: "border border-primary-container/20 bg-primary-container/8 px-4 py-3 text-[0.68rem] uppercase tracking-[0.16em] text-primary-container", children: "Sportradar sync in progress. Budget-aware Formula 1 and Rugby League jobs are running through the edge function." })) : null, feedHealth.length ? (feedHealth.map((row) => (_jsxs("div", { className: "flex items-center justify-between border-b border-outline-variant/15 pb-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-white", children: [row.display_name, row.sport_code ? ` • ${getSportLabel(row.sport_code)}` : ""] }), _jsxs("p", { className: "mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: ["Last sync ", row.started_at ? new Date(row.started_at).toLocaleString() : "unknown"] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.16em] text-primary-container", children: [_jsx(Radio, { className: "h-3.5 w-3.5" }), _jsx("span", { children: row.status ?? "standby" })] }), _jsxs("p", { className: "mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [row.request_count ?? 0, " requests"] })] })] }, `${row.provider_id}-${row.sport_code ?? "all"}`)))) : (_jsx("div", { className: "text-sm text-on-subtle", children: "No provider health rows yet. Apply the migration and start sync jobs to populate this panel." }))] })] }) }), _jsx("div", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Market Management" }), _jsx("h2", { className: "mt-2 font-headline text-2xl font-black uppercase tracking-tight text-white", children: "External Event Board" })] }), _jsxs("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]", children: [_jsx(Download, { className: "h-3.5 w-3.5" }), "Export"] })] }), _jsxs("div", { className: "mt-6 space-y-4", children: [boardEvents.slice(0, 5).map((event) => (_jsxs("div", { className: "grid gap-4 border-b border-outline-variant/15 pb-4 md:grid-cols-[minmax(0,1.2fr)_8rem_7rem] md:items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-white", children: event.title }), _jsxs("p", { className: "mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [getSportLabel(event.sportCode), " \u2022 ", event.markets.length, " pools \u2022 ", event.published ? "live" : "review"] })] }), _jsxs("div", { className: "text-left md:text-right", children: [_jsx("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: "Pool Total" }), _jsxs("p", { className: "font-semibold text-primary-container", children: [currencySymbol, event.markets.reduce((sum, market) => sum + market.totalPool, 0).toFixed(0)] })] }), _jsxs("div", { className: "text-left md:text-right", children: [_jsx("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: "Status" }), _jsx("p", { className: "font-semibold uppercase text-white", children: event.published ? "published" : "draft" })] })] }, event.id))), !boardEvents.length ? (_jsx("div", { className: "text-sm text-on-subtle", children: "No external events have been generated into betting containers yet." })) : null, publishedEvents > 0 ? (_jsxs("div", { className: "pt-2 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [publishedEvents, " event", publishedEvents === 1 ? "" : "s", " currently live, ", reviewEvents, " awaiting admin review"] })) : null] })] }) })] }), alerts.length ? (_jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center gap-2 text-danger", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), _jsx("p", { className: "prismatic-kicker text-danger", children: "System Alerts" })] }), _jsx("div", { className: "mt-5 grid gap-3 lg:grid-cols-3", children: alerts.map((alert) => (_jsx("div", { className: "border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-on-surface", children: alert }, alert))) })] }) })) : null, _jsxs("section", { className: "grid gap-8 xl:grid-cols-2", children: [_jsx(ApprovalPanel, { title: "Pending Deposits", items: depositsQuery.data ?? [], loading: depositsQuery.isLoading, onApprove: (id) => approveDepositMutation.mutate(id), approveDisabled: approveDepositMutation.isPending }), _jsx(ApprovalPanel, { title: "Pending Withdrawals", items: withdrawalsQuery.data ?? [], loading: withdrawalsQuery.isLoading, onApprove: (id) => approveWithdrawalMutation.mutate(id), approveDisabled: approveWithdrawalMutation.isPending, onReject: (id) => {
                            const confirmed = window.confirm("Reject withdrawal and refund the wallet balance?");
                            if (!confirmed)
                                return;
                            const reason = window.prompt("Reason for rejection?", "Manual review") ?? "";
                            rejectWithdrawalMutation.mutate({ id, reason: reason.trim() });
                        }, rejectDisabled: rejectWithdrawalMutation.isPending })] })] }));
};
const MetricCard = ({ label, value, accent }) => (_jsxs("div", { className: "border-l-2 border-primary-container bg-surface-low/85 px-5 py-5", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle", children: label }), _jsx("p", { className: `mt-3 font-headline text-4xl font-black ${accent}`, children: value })] }));
const ApprovalPanel = ({ title, items, loading, onApprove, approveDisabled, onReject, rejectDisabled }) => (_jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "font-headline text-2xl font-black uppercase tracking-tight text-white", children: title }), _jsxs("span", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: [items.length, " pending"] })] }), loading ? _jsx("p", { className: "mt-4 text-sm text-on-subtle", children: "Loading\u2026" }) : null, _jsxs("div", { className: "mt-5 space-y-3", children: [items.map((entry) => {
                        const profile = entry.profile;
                        const characterName = profile?.display_name ||
                            profile?.username ||
                            `User ${entry.user_id.slice(0, 8)}…`;
                        return (_jsxs("article", { className: "grid gap-4 border border-outline-variant/15 bg-surface-lowest/80 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-white", children: [currencySymbol, entry.amount.toFixed(2)] }), _jsxs("p", { className: "mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: [characterName, " \u2022 IC ", profile?.ic_number ?? "—"] }), _jsx("p", { className: "mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: new Date(entry.requested_at).toLocaleString() })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", className: "prismatic-button prismatic-button-primary min-h-[2.2rem] px-4 text-[0.58rem]", onClick: () => onApprove(entry.id), disabled: approveDisabled, children: "Approve" }), onReject ? (_jsx("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.2rem] px-4 text-[0.58rem]", onClick: () => onReject(entry.id), disabled: rejectDisabled, children: "Reject" })) : null] })] }, entry.id));
                    }), !loading && items.length === 0 ? (_jsx("div", { className: "text-sm text-on-subtle", children: "No pending requests." })) : null] })] }) }));
export default AdminDashboard;
