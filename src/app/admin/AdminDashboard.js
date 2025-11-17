import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { approveDeposit, approveWithdrawal, fetchPendingDeposits, fetchPendingWithdrawals, fetchAllWalletTransactions, rejectWithdrawal } from "@domains/wallet/api/walletApi";
import { useSession } from "@lib/auth/SessionProvider";
const AdminDashboard = () => {
    const queryClient = useQueryClient();
    const { user } = useSession();
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
        queryFn: () => fetchAllWalletTransactions(25)
    });
    const approveDepositMutation = useMutation({
        mutationFn: approveDeposit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
        }
    });
    const approveWithdrawalMutation = useMutation({
        mutationFn: approveWithdrawal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
        }
    });
    const rejectWithdrawalMutation = useMutation({
        mutationFn: ({ id, reason }) => rejectWithdrawal(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
        }
    });
    if (!user) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in with an admin account to access this dashboard." }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-[0.3em] text-white/60", children: "Admin" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Control Center" }), _jsx("p", { className: "text-sm text-white/60", children: "Manage pending deposits & withdrawals. Actions require betting_admin permissions enforced via RLS." })] }), _jsx(Link, { to: "/admin/session-setup", className: "inline-block rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:bg-brand/90", children: "+ Create Session" })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Pending Deposits" }), depositsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading\u2026" })), _jsxs("div", { className: "mt-4 space-y-3", children: [depositsQuery.data?.map((deposit) => (_jsxs("article", { className: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold", children: ["\u0189", deposit.amount.toFixed(2)] }), _jsxs("p", { className: "text-xs text-white/60", children: ["User ", deposit.user_id.slice(0, 8), "\u2026 \u00B7", " ", new Date(deposit.requested_at).toLocaleString()] })] }), _jsx("button", { className: "rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50", onClick: () => approveDepositMutation.mutate(deposit.id), disabled: approveDepositMutation.isPending, children: "Approve" })] }, deposit.id))), depositsQuery.data && depositsQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No pending deposits." }))] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Pending Withdrawals" }), withdrawalsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading\u2026" })), _jsxs("div", { className: "mt-4 space-y-3", children: [withdrawalsQuery.data?.map((withdrawal) => (_jsxs("article", { className: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold", children: ["\u0189", withdrawal.amount.toFixed(2)] }), _jsxs("p", { className: "text-xs text-white/60", children: ["User ", withdrawal.user_id.slice(0, 8), "\u2026 \u00B7", " ", new Date(withdrawal.requested_at).toLocaleString()] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50", onClick: () => approveWithdrawalMutation.mutate(withdrawal.id), disabled: approveWithdrawalMutation.isPending, children: "Approve" }), _jsx("button", { className: "rounded-full border border-red-400/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-300 disabled:opacity-50", onClick: () => {
                                                    const confirmed = window.confirm("Reject withdrawal and refund the wallet balance?");
                                                    if (!confirmed)
                                                        return;
                                                    const reason = window.prompt("Reason for rejection?", "Manual review") ?? "";
                                                    rejectWithdrawalMutation.mutate({
                                                        id: withdrawal.id,
                                                        reason: reason.trim()
                                                    });
                                                }, disabled: rejectWithdrawalMutation.isPending, children: "Reject" })] })] }, withdrawal.id))), withdrawalsQuery.data && withdrawalsQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No pending withdrawals." }))] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Wallet Audit Trail" }), _jsx("p", { className: "text-sm text-white/60", children: "Latest ledger entries across all users for compliance review." }), _jsxs("div", { className: "mt-4 space-y-3", children: [walletAuditQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading audit log\u2026" })), walletAuditQuery.data?.map((entry) => (_jsxs("article", { className: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold capitalize", children: entry.kind }), _jsxs("p", { className: "text-xs text-white/60", children: ["User ", entry.user_id.slice(0, 8), "\u2026 \u00B7", " ", new Date(entry.created_at).toLocaleString()] })] }), _jsxs("p", { className: "text-lg font-semibold", children: [entry.amount > 0 ? "+" : "", "\u0189", entry.amount.toFixed(2)] })] }, entry.id))), walletAuditQuery.data && walletAuditQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No ledger entries yet. Requests will populate here." }))] })] })] }));
};
export default AdminDashboard;
