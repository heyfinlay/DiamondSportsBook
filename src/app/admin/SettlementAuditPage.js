import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { fetchRecentSettlements, fetchPoolSettlementLedger, fetchSettlementSummary } from "@domains/betting/api/settlementAuditApi";
import { useSession } from "@lib/auth/SessionProvider";
import { currencySymbol } from "@lib/currency";
import { formatCurrency } from "../../features/markets/utils/format";
import FinalSettlementsTable from "../../features/markets/components/FinalSettlementsTable";
const SettlementAuditPage = () => {
    const { user } = useSession();
    const settlementsQuery = useQuery({
        queryKey: ["recent-settlements"],
        queryFn: () => fetchRecentSettlements(50),
        enabled: !!user
    });
    if (!user) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in with an admin account to access settlement audit." }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm uppercase tracking-[0.3em] text-white/60", children: "Admin" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Settlement Audit Trail" }), _jsx("p", { className: "text-sm text-white/60", children: "View all settled pools and payout distributions for compliance and verification." })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Recent Settlements" }), settlementsQuery.isLoading && (_jsx("p", { className: "mt-4 text-sm text-white/60", children: "Loading settlements\u2026" })), _jsxs("div", { className: "mt-4 space-y-3", children: [settlementsQuery.data?.map((settlement) => (_jsx(Link, { to: `/admin/settlements/${settlement.pool_id}`, className: "block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: settlement.events?.title || "Unknown Event" }), _jsxs("p", { className: "text-xs text-white/60", children: [settlement.markets?.name || "Unknown Pool", " \u2192", " ", settlement.outcomes?.label || "Unknown Outcome"] }), _jsxs("p", { className: "mt-1 text-xs text-white/40", children: ["Settled ", new Date(settlement.approved_at).toLocaleString()] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-sm font-semibold", children: [`${currencySymbol}${Number(settlement.handle || 0).toFixed(2)}`, " Pool"] }), _jsxs("p", { className: "text-xs text-white/60", children: [`${currencySymbol}${Number(settlement.rake_amount || 0).toFixed(2)}`, " Rake (", ((Number(settlement.rake_amount || 0) / Number(settlement.handle || 1)) * 100).toFixed(1), "%)"] }), _jsxs("p", { className: "text-xs text-white/60", children: [`${currencySymbol}${Number(settlement.distribution_pool || 0).toFixed(2)}`, " Paid"] })] })] }) }, settlement.id))), settlementsQuery.data && settlementsQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No settlements yet." }))] })] })] }));
};
export default SettlementAuditPage;
/**
 * Detail page for a specific pool's payouts
 */
export const PoolPayoutDetailPage = () => {
    const { poolId } = useParams();
    const { user } = useSession();
    const ledgerQuery = useQuery({
        queryKey: ["pool-ledger", poolId],
        queryFn: () => fetchPoolSettlementLedger(poolId),
        enabled: !!poolId && !!user
    });
    const summaryQuery = useQuery({
        queryKey: ["pool-summary", poolId],
        queryFn: () => fetchSettlementSummary(poolId),
        enabled: !!poolId && !!user
    });
    if (!user) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in to view payout details." }));
    }
    const payouts = ledgerQuery.data || [];
    const totalPayout = payouts.reduce((sum, p) => sum + Number(p.payout), 0);
    const winners = payouts.filter((row) => row.payout > 0);
    const summary = summaryQuery.data;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { children: [_jsx(Link, { to: "/admin/settlements", className: "text-sm uppercase tracking-[0.3em] text-white/60 hover:text-white", children: "\u2190 Back to Settlements" }), _jsx("h1", { className: "mt-2 text-3xl font-semibold", children: "Payout Details" }), _jsxs("p", { className: "text-sm text-white/60", children: ["Pool ID: ", poolId] })] }), _jsxs("section", { className: "grid gap-4 md:grid-cols-4", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Handle" }), _jsx("p", { className: "mt-1 text-2xl font-semibold", children: formatCurrency(Number(summary?.handle ?? 0)) })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Rake" }), _jsx("p", { className: "mt-1 text-2xl font-semibold", children: formatCurrency(Number(summary?.rake_amount ?? 0)) })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Paid to winners" }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-emerald-300", children: formatCurrency(totalPayout) })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Winners" }), _jsx("p", { className: "mt-1 text-2xl font-semibold", children: winners.length })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Settlement Ledger" }), ledgerQuery.isLoading ? (_jsx("p", { className: "mt-4 text-sm text-white/60", children: "Loading settlement ledger\u2026" })) : (_jsx(FinalSettlementsTable, { rows: payouts, emptyLabel: "No ledger entries found." })), summary && (_jsxs("p", { className: "mt-4 text-xs text-white/60", children: ["Confirmed ", new Date(summary.approved_at).toLocaleString(), " by", " ", summary.approved_by ? summary.approved_by.slice(0, 8) + "…" : "system"] }))] })] }));
};
