import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@lib/auth/SessionProvider";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletTransactions } from "@domains/wallet/hooks/useWalletTransactions";
import { requestDeposit, requestWithdrawal, fetchUserDeposits, fetchUserWithdrawals } from "@domains/wallet/api/walletApi";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useUserWagers } from "@domains/betting/hooks/useUserWagers";
import { useToast } from "@app/components/ToastProvider";
import { fetchUserProfile, updateUserProfile } from "@domains/profile/api/profileApi";
const AccountPage = () => {
    const { user, loading } = useSession();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const walletStoreBalance = useWalletStore((state) => state.balance);
    const [depositAmount, setDepositAmount] = useState("500");
    const [withdrawAmount, setWithdrawAmount] = useState("250");
    const [username, setUsername] = useState("");
    const [icPhoneNumber, setIcPhoneNumber] = useState("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const walletBalance = useWalletBalance(user?.id);
    const transactionsQuery = useWalletTransactions(user?.id);
    const wagersQuery = useUserWagers(user?.id);
    useWalletRealtime(user?.id ?? undefined);
    const profileQuery = useQuery({
        queryKey: ["user-profile", user?.id],
        queryFn: () => fetchUserProfile(user?.id ?? ""),
        enabled: !!user?.id
    });
    // Initialize form fields when profile data loads
    useEffect(() => {
        if (profileQuery.data) {
            setUsername(profileQuery.data.username ?? "");
            setIcPhoneNumber(profileQuery.data.ic_phone_number ?? "");
        }
    }, [profileQuery.data]);
    const depositsQuery = useQuery({
        queryKey: ["user-deposits", user?.id],
        queryFn: () => fetchUserDeposits(user?.id ?? ""),
        enabled: !!user?.id
    });
    const withdrawalsQuery = useQuery({
        queryKey: ["user-withdrawals", user?.id],
        queryFn: () => fetchUserWithdrawals(user?.id ?? ""),
        enabled: !!user?.id
    });
    const currentBalance = walletBalance.data?.balance ?? walletStoreBalance ?? 0;
    const isWalletLoading = walletBalance.isLoading || walletBalance.isRefetching;
    const depositMutation = useMutation({
        mutationFn: () => requestDeposit(Number(depositAmount)),
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Deposit requested",
                description: "An admin will review and credit your Diamonds shortly."
            });
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["user-deposits", user?.id] });
            setDepositAmount("500");
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Deposit failed",
                description: error.message
            });
        }
    });
    const withdrawalMutation = useMutation({
        mutationFn: () => requestWithdrawal(Number(withdrawAmount)),
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Withdrawal requested",
                description: "Funds are locked until race control approves the request."
            });
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["user-withdrawals", user?.id] });
            setWithdrawAmount("250");
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Withdrawal failed",
                description: error.message
            });
        }
    });
    const profileMutation = useMutation({
        mutationFn: () => updateUserProfile(user?.id ?? "", {
            username: username.trim() || undefined,
            ic_phone_number: icPhoneNumber.trim() || undefined
        }),
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Profile updated",
                description: "Your display name and IC phone number have been saved."
            });
            queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
            setIsEditingProfile(false);
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Update failed",
                description: error.message
            });
        }
    });
    if (!user && !loading) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in to manage your wallet." }));
    }
    const handleDeposit = (event) => {
        event.preventDefault();
        // Check for IC phone number requirement
        if (!profileQuery.data?.ic_phone_number) {
            toast({
                variant: "error",
                title: "Phone number required",
                description: "Please add your IC phone number in the profile section above before requesting a deposit."
            });
            setIsEditingProfile(true);
            return;
        }
        const amount = Number(depositAmount);
        if (!amount || amount <= 0) {
            toast({
                variant: "error",
                title: "Invalid amount",
                description: "Enter a positive deposit amount."
            });
            return;
        }
        depositMutation.mutate();
    };
    const handleWithdrawal = (event) => {
        event.preventDefault();
        // Check for IC phone number requirement
        if (!profileQuery.data?.ic_phone_number) {
            toast({
                variant: "error",
                title: "Phone number required",
                description: "Please add your IC phone number in the profile section above before requesting a withdrawal."
            });
            setIsEditingProfile(true);
            return;
        }
        const amount = Number(withdrawAmount);
        if (!amount || amount <= 0) {
            toast({
                variant: "error",
                title: "Invalid amount",
                description: "Enter a positive withdrawal amount."
            });
            return;
        }
        withdrawalMutation.mutate();
    };
    const handleProfileUpdate = (event) => {
        event.preventDefault();
        profileMutation.mutate();
    };
    const transactions = transactionsQuery.data ?? [];
    const depositEntries = depositsQuery.data ?? [];
    const withdrawalEntries = withdrawalsQuery.data ?? [];
    const wagers = wagersQuery.data ?? [];
    const balanceDisplay = useMemo(() => {
        if (isWalletLoading)
            return "…";
        return `Ɖ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }, [currentBalance, isWalletLoading]);
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/40 p-6 shadow-lg shadow-black/40", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Wallet" }), _jsxs("div", { className: "mt-3 flex flex-wrap items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-semibold text-white", children: "Account" }), _jsxs("p", { className: "text-sm text-white/60", children: ["Linked email: ", _jsx("span", { className: "font-mono", children: user?.email ?? "Loading…" })] })] }), _jsxs("div", { className: "rounded-2xl border border-white/20 bg-black/30 px-6 py-4 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/60", children: "Available Diamonds" }), _jsx("p", { className: "text-3xl font-semibold text-white", children: balanceDisplay })] })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-white/5 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Profile" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Display Settings" })] }), !isEditingProfile && (_jsx("button", { type: "button", onClick: () => setIsEditingProfile(true), className: "text-xs uppercase tracking-[0.3em] text-brand transition hover:text-white", children: "Edit" }))] }), isEditingProfile ? (_jsxs("form", { onSubmit: handleProfileUpdate, className: "mt-5 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Display Name" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "Enter your display name" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "IC Phone Number" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: icPhoneNumber, onChange: (e) => setIcPhoneNumber(e.target.value), placeholder: "In-character phone number" }), _jsx("p", { className: "mt-1 text-xs text-white/50", children: "Required for deposit and withdrawal requests" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: profileMutation.isPending, children: profileMutation.isPending ? "Saving…" : "Save Changes" }), _jsx("button", { type: "button", onClick: () => {
                                            setUsername(profileQuery.data?.username ?? "");
                                            setIcPhoneNumber(profileQuery.data?.ic_phone_number ?? "");
                                            setIsEditingProfile(false);
                                        }, className: "rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/5", children: "Cancel" })] })] })) : (_jsxs("div", { className: "mt-5 space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Display Name" }), _jsx("p", { className: "mt-1 text-white", children: profileQuery.data?.username || (_jsx("span", { className: "text-white/40", children: "Not set" })) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "IC Phone Number" }), _jsx("p", { className: "mt-1 text-white", children: profileQuery.data?.ic_phone_number || (_jsx("span", { className: "text-white/40", children: "Not set (required for deposits/withdrawals)" })) })] })] }))] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[repeat(3,minmax(0,1fr))]", children: [_jsxs("form", { onSubmit: handleDeposit, className: "rounded-3xl border border-white/10 bg-white/5 p-6 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Add Diamonds" }), _jsx("h3", { className: "mt-2 text-xl font-semibold", children: "Request Deposit" }), _jsx("p", { className: "text-sm text-white/70", children: "Submit for manual approval. Credits appear once racing ops confirms." }), _jsx("input", { type: "number", min: "1", step: "10", className: "mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: depositAmount, onChange: (event) => setDepositAmount(event.target.value) }), _jsx("button", { type: "submit", className: "mt-4 w-full rounded-2xl bg-white/90 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: depositMutation.isPending, children: depositMutation.isPending ? "Requesting…" : "Request Deposit" })] }), _jsxs("form", { onSubmit: handleWithdrawal, className: "rounded-3xl border border-white/10 bg-black/40 p-6 text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Cash Out" }), _jsx("h3", { className: "mt-2 text-xl font-semibold", children: "Request Withdrawal" }), _jsx("p", { className: "text-sm text-white/70", children: "Funds are held until administrators complete review." }), _jsx("input", { type: "number", min: "1", step: "10", className: "mt-4 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white", value: withdrawAmount, onChange: (event) => setWithdrawAmount(event.target.value) }), _jsx("button", { type: "submit", className: "mt-4 w-full rounded-2xl bg-brand py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: withdrawalMutation.isPending, children: withdrawalMutation.isPending ? "Submitting…" : "Request Withdrawal" })] }), _jsxs("div", { className: "rounded-3xl border border-dashed border-white/15 bg-transparent p-6 text-sm text-white/70", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Heads up" }), _jsxs("ul", { className: "mt-3 list-disc space-y-2 pl-5", children: [_jsx("li", { children: "Deposits/withdrawals require marshal approval for compliance." }), _jsx("li", { children: "Wagers immediately debit Diamonds and appear in the ledger." }), _jsx("li", { children: "Need help? Ping race control on the admin channel." })] })] })] }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("article", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Ledger" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Recent Transactions" })] }), transactionsQuery.isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Syncing\u2026" }))] }), _jsxs("div", { className: "mt-5 space-y-3", children: [transactions.map((tx) => (_jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold capitalize text-white", children: tx.kind }), _jsx("p", { className: "text-xs text-white/60", children: new Date(tx.created_at).toLocaleString() }), renderTransactionNote(tx.meta)] }), _jsxs("p", { className: `text-lg font-semibold ${tx.amount >= 0 ? "text-emerald-300" : "text-white"}`, children: [tx.amount > 0 ? "+" : "", "\u0189", tx.amount.toFixed(2)] })] }, tx.id))), !transactions.length && !transactionsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "No transactions yet \u2014 request a deposit or place a wager to see ledger entries." }))] })] }), _jsxs("article", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Activity" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "My Wagers" })] }), wagersQuery.isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Loading\u2026" }))] }), _jsxs("div", { className: "mt-5 space-y-3", children: [wagers.map((wager) => (_jsxs("div", { className: "rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white", children: [_jsxs("div", { className: "flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50", children: [_jsx("span", { className: "capitalize", children: wager.market_type.replace(/_/g, " ") }), _jsx("span", { className: `rounded-full px-2 py-0.5 ${wager.status === "won" ? "bg-emerald-500/20 text-emerald-300" :
                                                            wager.status === "lost" ? "bg-red-500/20 text-red-300" :
                                                                wager.status === "refunded" ? "bg-yellow-500/20 text-yellow-300" :
                                                                    "bg-blue-500/20 text-blue-300"}`, children: formatStatus(wager.status) })] }), _jsxs("p", { className: "mt-2 text-base font-semibold", children: ["\u0189", wager.stake.toFixed(2), " on ", wager.outcome_label] }), _jsx("p", { className: "text-xs text-white/60", children: wager.event_title }), _jsx("p", { className: "mt-1 text-xs text-white/60", children: wager.market_name }), _jsxs("div", { className: "mt-2 flex items-center justify-between", children: [_jsxs("div", { className: "text-xs text-white/60", children: [_jsxs("span", { children: ["Odds ", wager.effective_odds.toFixed(2)] }), _jsx("span", { className: "mx-1", children: "\u00B7" }), wager.status === "won" && wager.settled_payout ? (_jsxs("span", { className: "font-semibold text-emerald-300", children: ["Final Payout \u0189", wager.settled_payout.toFixed(2)] })) : wager.status === "void_refund" && wager.settled_payout ? (_jsxs("span", { className: "font-semibold text-yellow-300", children: ["Refunded \u0189", wager.settled_payout.toFixed(2)] })) : (_jsxs("span", { children: ["Potential \u0189", wager.estimated_payout.toFixed(2)] }))] }), _jsx("a", { href: `/market/${wager.market_id}`, className: "text-xs font-semibold uppercase tracking-[0.3em] text-brand transition hover:text-white", children: "View \u2192" })] }), _jsx("p", { className: "mt-1 text-xs text-white/50", children: new Date(wager.created_at).toLocaleString() })] }, wager.id))), !wagers.length && !wagersQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "No wagers yet. Select a market to place your first bet." }))] })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/20 p-6", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Requests" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Deposit & withdrawal status" })] }), _jsx("div", { className: "text-xs text-white/50", children: "Auto-refreshes whenever an admin updates your request." })] }), _jsxs("div", { className: "mt-6 grid gap-6 lg:grid-cols-2", children: [_jsx(RequestList, { title: "Deposits", isLoading: depositsQuery.isLoading, entries: depositEntries.map((entry) => ({
                                    id: entry.id,
                                    amount: entry.amount,
                                    status: entry.status,
                                    requested_at: entry.requested_at,
                                    resolved_at: entry.approved_at,
                                    resolved_by: entry.approved_by
                                })) }), _jsx(RequestList, { title: "Withdrawals", isLoading: withdrawalsQuery.isLoading, entries: withdrawalEntries.map((entry) => ({
                                    id: entry.id,
                                    amount: entry.amount,
                                    status: entry.status,
                                    requested_at: entry.requested_at,
                                    resolved_at: entry.processed_at,
                                    resolved_by: entry.processed_by
                                })) })] })] })] }));
};
const RequestList = ({ title, entries, isLoading }) => {
    return (_jsxs("div", { className: "rounded-3xl border border-white/10 bg-white/5 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: title }), isLoading && (_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Loading\u2026" }))] }), _jsxs("div", { className: "mt-4 space-y-3", children: [entries.map((entry) => (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("p", { className: "text-base font-semibold", children: ["\u0189", entry.amount.toFixed(2)] }), _jsx("span", { className: "rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70", children: formatStatus(entry.status) })] }), _jsxs("p", { className: "text-xs text-white/60", children: ["Requested ", new Date(entry.requested_at).toLocaleString()] }), entry.resolved_at && (_jsxs("p", { className: "text-xs text-emerald-300", children: ["Cleared ", new Date(entry.resolved_at).toLocaleString(), entry.resolved_by && _jsxs(_Fragment, { children: [" \u00B7 by ", formatUserId(entry.resolved_by)] })] }))] }, entry.id))), !entries.length && !isLoading && (_jsxs("p", { className: "text-sm text-white/60", children: ["No ", title.toLowerCase(), " yet."] }))] })] }));
};
const renderTransactionNote = (meta) => {
    if (!meta)
        return null;
    const typed = meta;
    if (typeof typed.market_id === "string" && typeof typed.outcome_id === "string") {
        return _jsxs("p", { className: "text-xs text-white/50", children: ["Market #", typed.market_id.slice(0, 6), "\u2026"] });
    }
    if (typeof typed.reason === "string") {
        return _jsx("p", { className: "text-xs text-white/50", children: typed.reason });
    }
    return null;
};
const formatStatus = (status) => {
    return status ? status.replace(/_/g, " ") : "pending";
};
const formatUserId = (id) => `${id.slice(0, 6)}…`;
export default AccountPage;
