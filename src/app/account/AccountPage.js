import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@lib/auth/SessionProvider";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletTransactions } from "@domains/wallet/hooks/useWalletTransactions";
import { requestDeposit, requestWithdrawal } from "@domains/wallet/api/walletApi";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
const AccountPage = () => {
    const { user, loading } = useSession();
    const queryClient = useQueryClient();
    const [depositAmount, setDepositAmount] = useState("500");
    const [withdrawAmount, setWithdrawAmount] = useState("250");
    const [statusMessage, setStatusMessage] = useState(null);
    const walletBalance = useWalletBalance(user?.id);
    const transactionsQuery = useWalletTransactions(user?.id);
    useWalletRealtime(user?.id ?? undefined);
    const depositMutation = useMutation({
        mutationFn: () => requestDeposit(Number(depositAmount)),
        onMutate: () => setStatusMessage(null),
        onSuccess: () => {
            setStatusMessage("Deposit requested. Awaiting admin approval.");
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
        },
        onError: (error) => {
            setStatusMessage(error.message);
        }
    });
    const withdrawalMutation = useMutation({
        mutationFn: () => requestWithdrawal(Number(withdrawAmount)),
        onMutate: () => setStatusMessage(null),
        onSuccess: () => {
            setStatusMessage("Withdrawal requested. Funds locked until review.");
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
        },
        onError: (error) => {
            setStatusMessage(error.message);
        }
    });
    if (!user && !loading) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in to manage your wallet." }));
    }
    const handleDeposit = (event) => {
        event.preventDefault();
        const amount = Number(depositAmount);
        if (!amount || amount <= 0) {
            setStatusMessage("Enter a valid deposit amount.");
            return;
        }
        depositMutation.mutate();
    };
    const handleWithdrawal = (event) => {
        event.preventDefault();
        const amount = Number(withdrawAmount);
        if (!amount || amount <= 0) {
            setStatusMessage("Enter a valid withdrawal amount.");
            return;
        }
        withdrawalMutation.mutate();
    };
    const transactions = transactionsQuery.data ?? [];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm uppercase tracking-[0.3em] text-white/60", children: "Wallet" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Account" }), _jsxs("p", { className: "text-white/60", children: ["Current balance:", " ", walletBalance.data
                                ? `Ɖ${walletBalance.data.balance.toLocaleString()}`
                                : walletBalance.isLoading
                                    ? "…"
                                    : "Ɖ0"] })] }), statusMessage && (_jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80", children: statusMessage })), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("form", { className: "rounded-3xl border border-white/10 bg-brand/10 px-6 py-5 text-white", onSubmit: handleDeposit, children: [_jsx("h3", { className: "text-xl font-semibold", children: "Deposit" }), _jsx("p", { className: "text-sm text-white/80", children: "Request admin-approved credit." }), _jsx("input", { type: "number", min: "1", step: "10", className: "mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: depositAmount, onChange: (e) => setDepositAmount(e.target.value) }), _jsx("button", { type: "submit", className: "mt-4 w-full rounded-2xl bg-white/90 py-2 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50", disabled: depositMutation.isPending, children: depositMutation.isPending ? "Requesting…" : "Request Deposit" })] }), _jsxs("form", { className: "rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-white", onSubmit: handleWithdrawal, children: [_jsx("h3", { className: "text-xl font-semibold", children: "Withdraw" }), _jsx("p", { className: "text-sm text-white/80", children: "Submit withdrawal for review." }), _jsx("input", { type: "number", min: "1", step: "10", className: "mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: withdrawAmount, onChange: (e) => setWithdrawAmount(e.target.value) }), _jsx("button", { type: "submit", className: "mt-4 w-full rounded-2xl bg-brand py-2 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50", disabled: withdrawalMutation.isPending, children: withdrawalMutation.isPending ? "Submitting…" : "Request Withdrawal" })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Recent Transactions" }), _jsxs("div", { className: "mt-4 space-y-3", children: [transactionsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading transactions\u2026" })), transactions.map((tx) => (_jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold capitalize", children: tx.kind }), _jsx("p", { className: "text-xs text-white/60", children: new Date(tx.created_at).toLocaleString() })] }), _jsxs("p", { className: "text-lg font-semibold", children: [tx.amount > 0 ? "+" : "", "\u0189", tx.amount.toFixed(2)] })] }, tx.id))), transactions.length === 0 && !transactionsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "No transactions yet \u2014 request a deposit or place a wager to see ledger entries." }))] })] })] }));
};
export default AccountPage;
