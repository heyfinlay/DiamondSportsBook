import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, LockKeyhole, ShieldCheck } from "lucide-react";
import { useSession } from "@lib/auth/SessionProvider";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletTransactions } from "@domains/wallet/hooks/useWalletTransactions";
import { requestDeposit, requestWithdrawal, fetchUserDeposits, fetchUserWithdrawals } from "@domains/wallet/api/walletApi";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useUserWagers } from "@domains/betting/hooks/useUserWagers";
import { useToast } from "@app/components/ToastProvider";
import { fetchUserProfile } from "@domains/profile/api/profileApi";
import { currencyLabel, currencySymbol } from "@lib/currency";
import { walletKeys } from "@lib/query/keys";
const currencyLabelTitle = currencyLabel.charAt(0).toUpperCase() + currencyLabel.slice(1);
const AccountPage = () => {
    const { user, loading } = useSession();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const walletStoreBalance = useWalletStore((state) => state.balance);
    const [depositAmount, setDepositAmount] = useState("500");
    const [withdrawAmount, setWithdrawAmount] = useState("250");
    const [ledgerFilter, setLedgerFilter] = useState("all");
    const walletBalance = useWalletBalance(user?.id);
    const transactionsQuery = useWalletTransactions(user?.id);
    const wagersQuery = useUserWagers(user?.id);
    useWalletRealtime(user?.id ?? undefined);
    const profileQuery = useQuery({
        queryKey: ["user-profile", user?.id],
        queryFn: () => fetchUserProfile(user?.id ?? ""),
        enabled: !!user?.id
    });
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
                description: `An admin will review and credit your ${currencyLabel} shortly.`
            });
            queryClient.invalidateQueries({ queryKey: walletKeys.transactions(user?.id) });
            queryClient.invalidateQueries({ queryKey: walletKeys.balance(user?.id) });
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
            queryClient.invalidateQueries({ queryKey: walletKeys.transactions(user?.id) });
            queryClient.invalidateQueries({ queryKey: walletKeys.balance(user?.id) });
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
    const handleDeposit = (event) => {
        event.preventDefault();
        if (!profileQuery.data?.ic_number) {
            toast({
                variant: "error",
                title: "IC number required",
                description: "Add your IC number from Account Settings before requesting a deposit."
            });
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
        if (!profileQuery.data?.ic_number) {
            toast({
                variant: "error",
                title: "IC number required",
                description: "Add your IC number from Account Settings before requesting a withdrawal."
            });
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
    const transactions = transactionsQuery.data ?? [];
    const depositEntries = depositsQuery.data ?? [];
    const withdrawalEntries = withdrawalsQuery.data ?? [];
    const wagers = wagersQuery.data ?? [];
    const pendingDeposits = depositEntries.filter((entry) => entry.status !== "approved");
    const pendingWithdrawals = withdrawalEntries.filter((entry) => entry.status !== "processed");
    const totalWagers = wagers.length;
    const totalWon = wagers.filter((wager) => wager.status === "won").length;
    const totalLost = wagers.filter((wager) => wager.status === "lost").length;
    const pendingAmount = [...pendingDeposits, ...pendingWithdrawals].reduce((sum, entry) => sum + entry.amount, 0);
    const inPlayAmount = wagers
        .filter((wager) => !["won", "lost", "void_refund", "refunded"].includes(wager.status))
        .reduce((sum, wager) => sum + wager.stake, 0);
    const netChange = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const progressValue = Math.min(100, (user ? 36 : 0) +
        (profileQuery.data?.ic_number ? 34 : 0) +
        (transactions.length ? 15 : 0) +
        (wagers.length ? 15 : 0));
    const tierTitle = profileQuery.data?.ic_number ? "Diamond Elite" : "Verification Pending";
    const tierSubtitle = profileQuery.data?.ic_number
        ? "Accessing priority institutional clearing"
        : "Add your IC number to unlock request routing";
    const lastSession = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Awaiting login";
    const authStatus = user ? "Encrypted" : "Guest";
    const activeDisbursal = pendingWithdrawals[0] ?? null;
    const balanceDisplay = useMemo(() => {
        if (isWalletLoading)
            return "…";
        return `${currencySymbol}${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }, [currentBalance, isWalletLoading]);
    const ledgerRows = useMemo(() => {
        if (ledgerFilter === "credits")
            return transactions.filter((tx) => tx.amount > 0);
        if (ledgerFilter === "debits")
            return transactions.filter((tx) => tx.amount < 0);
        return transactions;
    }, [ledgerFilter, transactions]);
    const showGuestOnly = !user && !loading;
    return (_jsxs("div", { className: "space-y-8", children: [showGuestOnly ? (_jsxs("section", { className: "prismatic-card p-8 text-center", children: [_jsx("p", { className: "font-headline text-2xl font-extrabold uppercase tracking-[0.08em] text-white", children: "Guest Vault" }), _jsx("p", { className: "mt-3 text-sm text-on-subtle", children: "Sign in to manage your balance, funding requests, and wager ledger." }), _jsx("div", { className: "mt-6 flex justify-center", children: _jsx(Link, { to: "/login?mode=signin", className: "prismatic-button prismatic-button-primary", children: "Sign In" }) })] })) : null, showGuestOnly ? null : (_jsxs(_Fragment, { children: [_jsxs("section", { className: "grid gap-1 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]", children: [_jsx("div", { className: "prismatic-card px-8 py-10 md:px-10", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker", children: "Total Net Liquidity" }), _jsxs("div", { className: "mt-6 flex flex-wrap items-end gap-4", children: [_jsx("span", { className: "font-headline text-5xl font-extrabold tracking-tight text-white md:text-7xl", children: balanceDisplay }), _jsxs("span", { className: `pb-3 text-sm font-semibold ${netChange >= 0 ? "text-primary-dim" : "text-danger"}`, children: [netChange >= 0 ? "+" : "", currencySymbol, Math.abs(netChange).toFixed(2)] })] }), _jsxs("div", { className: "mt-12 grid gap-8 border-t border-outline-variant/10 pt-8 sm:grid-cols-3", children: [_jsx(Metric, { label: "Available", value: balanceDisplay }), _jsx(Metric, { label: "In-Play", value: `${currencySymbol}${inPlayAmount.toFixed(2)}` }), _jsx(Metric, { label: "Pending", value: `${currencySymbol}${pendingAmount.toFixed(2)}`, muted: true })] })] }) }), _jsx("div", { className: "prismatic-card px-8 py-10", children: _jsxs("div", { className: "relative z-10 flex h-full flex-col justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker", children: "Security Tier" }), _jsxs("div", { className: "mt-8 flex items-center gap-3", children: [_jsx(ShieldCheck, { className: "h-6 w-6 text-primary-container" }), _jsx("span", { className: "font-headline text-3xl font-extrabold uppercase tracking-[0.08em] text-white", children: tierTitle })] }), _jsx("p", { className: "mt-4 text-sm text-on-subtle", children: tierSubtitle })] }), _jsxs("div", { className: "mt-8 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: [_jsx("span", { children: "Progression To Obsidian" }), _jsxs("span", { className: "text-white", children: [progressValue, "%"] })] }), _jsx("div", { className: "h-[2px] bg-surface-highest", children: _jsx("div", { className: "h-full bg-primary-container", style: { width: `${progressValue}%` } }) }), _jsx("a", { href: "#withdraw-request", className: "prismatic-button prismatic-button-primary w-full", children: "Withdrawal Request" })] })] }) })] }), !profileQuery.isLoading && !profileQuery.data?.ic_number ? (_jsxs("div", { className: "border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger", children: ["Add your IC number in", " ", _jsx(Link, { to: "/account/settings", className: "underline underline-offset-4", children: "Account Settings" }), " ", "to unlock deposit and withdrawal requests."] })) : null, _jsxs("section", { className: "grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)]", children: [_jsxs("div", { className: "prismatic-glass p-8", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("h2", { className: "prismatic-kicker", children: "Active Disbursals" }), _jsxs("span", { className: "border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-primary-dim", children: [pendingWithdrawals.length, " Pending"] })] }), _jsx("div", { className: "mt-8 border border-white/10 bg-surface-lowest/60 p-4", children: activeDisbursal ? (_jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "inline-flex h-12 w-12 items-center justify-center bg-surface-highest text-on-subtle", children: _jsx(Banknote, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsxs("p", { className: "text-2xl font-bold text-white", children: [currencySymbol, activeDisbursal.amount.toFixed(2)] }), _jsx("p", { className: "text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: "Settlement To Bank" })] })] }), _jsxs("div", { className: "text-left md:text-right", children: [_jsx("p", { className: "font-headline text-sm font-bold uppercase tracking-[0.12em] text-primary-dim", children: "Processing" }), _jsxs("p", { className: "mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: ["Requested ", new Date(activeDisbursal.requested_at).toLocaleDateString()] })] })] })) : (_jsx("p", { className: "text-sm text-on-subtle", children: "No active withdrawals. Approved cashouts appear here." })) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2", children: [_jsx(MetaCard, { icon: _jsx(LockKeyhole, { className: "h-5 w-5 text-outline" }), label: "Last Session", value: lastSession }), _jsx(MetaCard, { icon: _jsx(ShieldCheck, { className: "h-5 w-5 text-outline" }), label: "Auth Status", value: authStatus, tone: "text-primary-dim" })] })] }), _jsxs("section", { className: "grid gap-4 lg:grid-cols-4", children: [_jsx(SummaryTile, { label: "Pending Deposits", value: pendingDeposits.length.toString() }), _jsx(SummaryTile, { label: "Pending Withdrawals", value: pendingWithdrawals.length.toString() }), _jsx(SummaryTile, { label: "Total Wagers", value: totalWagers.toString() }), _jsx(SummaryTile, { label: "Win / Loss", value: `${totalWon} / ${totalLost}` })] }), _jsxs("section", { className: "prismatic-card p-6 sm:p-8", children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6", children: [_jsx("h2", { className: "prismatic-kicker text-white", children: "Ledger History" }), _jsx("div", { className: "flex gap-4", children: [
                                            { key: "all", label: "All Activity" },
                                            { key: "credits", label: "Credits" },
                                            { key: "debits", label: "Debits" }
                                        ].map((option) => (_jsx("button", { type: "button", onClick: () => setLedgerFilter(option.key), className: `pb-1 text-[0.68rem] uppercase tracking-[0.16em] ${ledgerFilter === option.key
                                                ? "border-b border-white text-white"
                                                : "text-on-subtle transition hover:text-white"}`, children: option.label }, option.key))) })] }), _jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "prismatic-table min-w-full", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 text-left", children: "Transaction ID" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Type" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Details" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Date / Time" }), _jsx("th", { className: "px-6 py-4 text-right", children: "Amount" })] }) }), _jsx("tbody", { children: ledgerRows.map((tx) => (_jsxs("tr", { children: [_jsxs("td", { className: "px-6 py-5 text-sm text-on-subtle", children: ["#", tx.id.slice(0, 8)] }), _jsx("td", { className: "px-6 py-5", children: _jsx("span", { className: `inline-flex border px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] ${tx.amount >= 0 ? "border-primary-container/25 bg-primary-container/10 text-primary-dim" : "border-white/10 bg-white/5 text-on-subtle"}`, children: formatStatus(tx.kind) }) }), _jsx("td", { className: "px-6 py-5", children: _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-base text-white", children: renderTransactionLabel(tx.kind, tx.meta) }), renderTransactionNote(tx.meta)] }) }), _jsx("td", { className: "px-6 py-5 text-sm text-on-subtle", children: new Date(tx.created_at).toLocaleString() }), _jsxs("td", { className: `px-6 py-5 text-right text-2xl font-bold ${tx.amount >= 0 ? "text-white" : "text-on-subtle"}`, children: [tx.amount > 0 ? "+" : "", currencySymbol, Math.abs(tx.amount).toFixed(2)] })] }, tx.id))) })] }), !ledgerRows.length && !transactionsQuery.isLoading ? (_jsx("p", { className: "px-6 py-8 text-sm text-on-subtle", children: "No transactions yet. Request a deposit or place a wager to see ledger entries." })) : null] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "prismatic-card p-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Vault Actions" }), _jsx("h2", { className: "mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Funding Requests" })] }), _jsx(Link, { to: "/account/settings", className: "prismatic-button prismatic-button-secondary text-[0.62rem]", children: "Account Settings" })] }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs("form", { onSubmit: handleDeposit, className: "border border-white/10 bg-surface px-5 py-5", children: [_jsxs("p", { className: "prismatic-kicker", children: ["Add ", currencyLabelTitle] }), _jsx("h3", { className: "mt-3 font-headline text-xl font-extrabold uppercase tracking-[0.05em] text-white", children: "Request Deposit" }), _jsx("p", { className: "mt-2 text-sm text-on-subtle", children: "Manual approval required." }), _jsx("input", { type: "number", min: "1", step: "any", inputMode: "decimal", className: "prismatic-input mt-4", value: depositAmount, onChange: (event) => setDepositAmount(event.target.value) }), _jsx("button", { type: "submit", className: "prismatic-button prismatic-button-secondary mt-5 w-full", disabled: depositMutation.isPending, children: depositMutation.isPending ? "Requesting" : "Submit Deposit" })] }), _jsxs("form", { id: "withdraw-request", onSubmit: handleWithdrawal, className: "border border-white/10 bg-surface px-5 py-5", children: [_jsx("p", { className: "prismatic-kicker", children: "Cash Out" }), _jsx("h3", { className: "mt-3 font-headline text-xl font-extrabold uppercase tracking-[0.05em] text-white", children: "Request Withdrawal" }), _jsx("p", { className: "mt-2 text-sm text-on-subtle", children: "Funds remain locked until review completes." }), _jsx("input", { type: "number", min: "1", step: "any", inputMode: "decimal", className: "prismatic-input mt-4", value: withdrawAmount, onChange: (event) => setWithdrawAmount(event.target.value) }), _jsx("button", { type: "submit", className: "prismatic-button prismatic-button-primary mt-5 w-full", disabled: withdrawalMutation.isPending, children: withdrawalMutation.isPending ? "Submitting" : "Submit Withdrawal" })] })] })] }), _jsxs("div", { className: "prismatic-card p-6", children: [_jsxs("div", { className: "mb-5", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Requests" }), _jsx("h2", { className: "mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Deposit & Withdrawal Status" })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(RequestList, { title: "Deposits", isLoading: depositsQuery.isLoading, entries: depositEntries.map((entry) => ({
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
                                                        })) })] })] })] }), _jsxs("div", { className: "prismatic-card p-6", children: [_jsxs("div", { className: "mb-5", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Activity" }), _jsx("h2", { className: "mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white", children: "My Wagers" })] }), _jsxs("div", { className: "space-y-3", children: [wagers.map((wager) => (_jsxs("div", { className: "border border-white/10 bg-surface px-4 py-4 text-sm text-white", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle", children: [_jsx("span", { children: wager.market_type.replace(/_/g, " ") }), _jsx("span", { className: statusPillClass(wager.status), children: formatStatus(wager.status) })] }), _jsxs("p", { className: "mt-3 text-lg font-semibold", children: [currencySymbol, wager.stake.toFixed(2), " on ", wager.outcome_label] }), _jsx("p", { className: "mt-1 text-xs uppercase tracking-[0.14em] text-on-subtle", children: wager.event_title }), _jsx("p", { className: "mt-1 text-xs uppercase tracking-[0.14em] text-on-subtle", children: wager.market_name }), _jsxs("div", { className: "mt-4 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "text-xs text-on-subtle", children: ["Odds ", wager.effective_odds.toFixed(2), " \u00B7", " ", wager.status === "won" && wager.settled_payout
                                                                        ? `Final Payout ${currencySymbol}${wager.settled_payout.toFixed(2)}`
                                                                        : `Potential ${currencySymbol}${wager.estimated_payout.toFixed(2)}`] }), _jsx("a", { href: `/market/${wager.market_id}`, className: "prismatic-kicker text-primary-dim transition hover:text-white", children: "View" })] }), _jsx("p", { className: "mt-2 text-xs text-on-subtle", children: new Date(wager.created_at).toLocaleString() })] }, wager.id))), !wagers.length && !wagersQuery.isLoading ? (_jsx("p", { className: "text-sm text-on-subtle", children: "No wagers yet. Select a market to place your first bet." })) : null] })] })] })] }))] }));
};
const Metric = ({ label, value, muted = false }) => (_jsxs("div", { children: [_jsx("p", { className: "text-[0.62rem] font-headline tracking-[0.16em] uppercase text-on-subtle", children: label }), _jsx("p", { className: `mt-2 text-3xl font-bold ${muted ? "text-on-subtle" : "text-white"}`, children: value })] }));
const MetaCard = ({ icon, label, value, tone = "text-white" }) => (_jsxs("div", { className: "bg-surface-low px-6 py-6", children: [_jsx("div", { children: icon }), _jsx("p", { className: "mt-4 text-[0.62rem] font-headline tracking-[0.16em] uppercase text-on-subtle", children: label }), _jsx("p", { className: `mt-3 text-lg font-semibold ${tone}`, children: value })] }));
const SummaryTile = ({ label, value }) => (_jsxs("div", { className: "prismatic-metric px-5 py-4", children: [_jsx("p", { className: "prismatic-kicker", children: label }), _jsx("p", { className: "mt-2 font-headline text-3xl font-extrabold text-white", children: value })] }));
const RequestList = ({ title, entries, isLoading }) => {
    return (_jsxs("div", { className: "border border-white/10 bg-surface px-4 py-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-headline text-lg font-extrabold uppercase tracking-[0.05em] text-white", children: title }), isLoading ? _jsx("span", { className: "prismatic-kicker", children: "Loading" }) : null] }), _jsxs("div", { className: "mt-4 space-y-3", children: [entries.map((entry) => (_jsxs("article", { className: "border border-white/10 bg-surface-lowest px-4 py-3 text-sm text-white", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("p", { className: "text-base font-semibold", children: [currencySymbol, entry.amount.toFixed(2)] }), _jsx("span", { className: statusPillClass(entry.status), children: formatStatus(entry.status) })] }), _jsxs("p", { className: "mt-2 text-xs text-on-subtle", children: ["Requested ", new Date(entry.requested_at).toLocaleString()] }), entry.resolved_at ? (_jsxs("p", { className: "mt-1 text-xs text-primary-dim", children: ["Cleared ", new Date(entry.resolved_at).toLocaleString(), entry.resolved_by ? ` · ${formatUserId(entry.resolved_by)}` : ""] })) : null] }, entry.id))), !entries.length && !isLoading ? (_jsxs("p", { className: "text-sm text-on-subtle", children: ["No ", title.toLowerCase(), " yet."] })) : null] })] }));
};
const renderTransactionLabel = (kind, meta) => {
    if (!meta)
        return formatStatus(kind);
    const typed = meta;
    if (typeof typed.reason === "string" && typed.reason.trim().length)
        return typed.reason;
    if (typeof typed.note === "string" && typed.note.trim().length)
        return typed.note;
    if (typeof typed.market_id === "string")
        return `Market settlement ${typed.market_id.slice(0, 8)}`;
    return formatStatus(kind);
};
const renderTransactionNote = (meta) => {
    if (!meta)
        return null;
    const typed = meta;
    if (typeof typed.market_id === "string" && typeof typed.outcome_id === "string") {
        return _jsxs("p", { className: "text-xs uppercase tracking-[0.14em] text-on-subtle", children: ["Market #", typed.market_id.slice(0, 6), "\u2026"] });
    }
    if (typeof typed.reason === "string") {
        return _jsx("p", { className: "text-xs uppercase tracking-[0.14em] text-on-subtle", children: typed.reason });
    }
    return null;
};
const formatStatus = (status) => (status ? status.replace(/_/g, " ") : "pending");
const formatUserId = (id) => `${id.slice(0, 6)}…`;
const statusPillClass = (status) => {
    if (status === "won" || status.includes("approved") || status.includes("processed")) {
        return "inline-flex border border-primary-container/25 bg-primary-container/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-primary-dim";
    }
    if (status === "lost" || status.includes("rejected") || status.includes("failed")) {
        return "inline-flex border border-danger/25 bg-danger/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-danger";
    }
    return "inline-flex border border-white/10 bg-white/5 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle";
};
export default AccountPage;
