import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet2 } from "lucide-react";
import { adminAdjustWalletBalance, fetchAdminWalletAccounts, fetchAllWalletTransactions } from "@domains/wallet/api/walletApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { walletKeys } from "@lib/query/keys";
const WalletAccountsPage = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [selectedUserId, setSelectedUserId] = useState("");
    const [amount, setAmount] = useState("250");
    const [reason, setReason] = useState("manual_top_up");
    const [note, setNote] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const accountsQuery = useQuery({
        queryKey: walletKeys.adminAccounts(),
        queryFn: () => fetchAdminWalletAccounts(200)
    });
    const auditQuery = useQuery({
        queryKey: ["admin-wallet-audit"],
        queryFn: () => fetchAllWalletTransactions(20)
    });
    const adjustMutation = useMutation({
        mutationFn: adminAdjustWalletBalance,
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Wallet adjusted",
                description: "The balance change was written to the wallet ledger."
            });
            setAmount("250");
            setNote("");
            void queryClient.invalidateQueries({ queryKey: walletKeys.adminAccounts() });
            void queryClient.invalidateQueries({ queryKey: ["admin-wallet-audit"] });
            void queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
            void queryClient.invalidateQueries({ queryKey: ["wallet-transactions"], exact: false });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Balance adjustment failed",
                description: error.message
            });
        }
    });
    const accounts = accountsQuery.data ?? [];
    const filteredAccounts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query)
            return accounts;
        return accounts.filter((account) => {
            const haystack = [
                account.profile?.display_name,
                account.profile?.username,
                account.profile?.ic_number,
                account.user_id
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [accounts, searchQuery]);
    const selectedAccount = filteredAccounts.find((account) => account.user_id === selectedUserId) ??
        accounts.find((account) => account.user_id === selectedUserId) ??
        null;
    const totalBalances = accounts.reduce((sum, account) => sum + account.balance, 0);
    const fundedAccounts = accounts.filter((account) => account.balance > 0).length;
    const handleSubmit = (event) => {
        event.preventDefault();
        const numericAmount = Number(amount);
        if (!selectedUserId) {
            toast({
                variant: "error",
                title: "Choose an account",
                description: "Select a wallet account before submitting an adjustment."
            });
            return;
        }
        if (!numericAmount || Number.isNaN(numericAmount)) {
            toast({
                variant: "error",
                title: "Invalid amount",
                description: "Enter a positive or negative amount."
            });
            return;
        }
        adjustMutation.mutate({
            userId: selectedUserId,
            amount: numericAmount,
            reason,
            note
        });
    };
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Wallet Source Of Truth" }), _jsx("h1", { className: "mt-3 font-headline text-4xl font-black uppercase tracking-tight text-white", children: "Wallet Control" }), _jsx("p", { className: "mt-4 max-w-3xl text-sm leading-7 text-on-subtle", children: "Inspect every wallet on the platform, review current balances, and apply remote credit or debit adjustments directly into the ledger." })] }), _jsxs("section", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(MetricCard, { label: "Tracked Accounts", value: String(accounts.length) }), _jsx(MetricCard, { label: "Funded Accounts", value: String(fundedAccounts) }), _jsx(MetricCard, { label: "Total Balance", value: `${currencySymbol}${totalBalances.toFixed(0)}` }), _jsx(MetricCard, { label: "Recent Ledger Entries", value: String((auditQuery.data ?? []).length) })] }), _jsxs("section", { className: "grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.85fr)]", children: [_jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Account Ledger" }), _jsx("h2", { className: "mt-2 font-headline text-2xl font-black uppercase tracking-tight text-white", children: "Wallet Accounts" })] }), _jsx("input", { type: "search", value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), placeholder: "Search name, username, IC, or user ID", className: "min-h-[2.75rem] w-full max-w-sm border border-outline-variant/15 bg-surface-lowest px-4 text-sm text-white outline-none transition placeholder:text-on-subtle focus:border-primary-container/35" })] }), _jsxs("div", { className: "mt-6 overflow-x-auto", children: [_jsxs("table", { className: "prismatic-table min-w-full", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 text-left", children: "Account" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Balance" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Transactions" }), _jsx("th", { className: "px-6 py-4 text-left", children: "Last Activity" }), _jsx("th", { className: "px-6 py-4 text-right", children: "Select" })] }) }), _jsx("tbody", { children: filteredAccounts.map((account) => {
                                                        const label = account.profile?.display_name ||
                                                            account.profile?.username ||
                                                            `User ${account.user_id.slice(0, 8)}…`;
                                                        return (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-5", children: _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-semibold text-white", children: label }), _jsxs("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: ["@", account.profile?.username ?? "no-username", " \u2022 IC ", account.profile?.ic_number ?? "—"] })] }) }), _jsxs("td", { className: "px-6 py-5 text-sm font-semibold text-white", children: [currencySymbol, account.balance.toFixed(2)] }), _jsx("td", { className: "px-6 py-5 text-sm text-on-subtle", children: account.transaction_count }), _jsx("td", { className: "px-6 py-5 text-sm text-on-subtle", children: account.last_transaction_at
                                                                        ? new Date(account.last_transaction_at).toLocaleString()
                                                                        : "No activity" }), _jsx("td", { className: "px-6 py-5 text-right", children: _jsx("button", { type: "button", className: "prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]", onClick: () => setSelectedUserId(account.user_id), children: selectedUserId === account.user_id ? "Selected" : "Manage" }) })] }, account.account_id));
                                                    }) })] }), !accountsQuery.isLoading && filteredAccounts.length === 0 ? (_jsx("p", { className: "px-6 py-8 text-sm text-on-subtle", children: "No wallet accounts matched this search." })) : null] })] }) }), _jsxs("aside", { className: "space-y-6", children: [_jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Wallet2, { className: "h-5 w-5 text-primary-container" }), _jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Manual Adjustment" }), _jsx("h2", { className: "mt-1 font-headline text-2xl font-black uppercase tracking-tight text-white", children: "Balance Control" })] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "mt-6 space-y-4", children: [_jsxs("div", { className: "border border-outline-variant/15 bg-surface-lowest/80 px-4 py-4", children: [_jsx("p", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: "Selected Account" }), _jsx("p", { className: "mt-2 text-sm font-semibold text-white", children: selectedAccount
                                                                ? selectedAccount.profile?.display_name ||
                                                                    selectedAccount.profile?.username ||
                                                                    selectedAccount.user_id
                                                                : "Choose an account from the ledger" }), selectedAccount ? (_jsxs("p", { className: "mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: ["Current balance ", currencySymbol, selectedAccount.balance.toFixed(2)] })) : null] }), _jsxs("label", { className: "block space-y-2 text-sm", children: [_jsx("span", { className: "text-on-subtle", children: "Amount" }), _jsx("input", { type: "number", step: "0.01", value: amount, onChange: (event) => setAmount(event.target.value), className: "min-h-[2.75rem] w-full border border-outline-variant/15 bg-surface-lowest px-4 text-white outline-none transition focus:border-primary-container/35" }), _jsx("span", { className: "text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle", children: "Use a positive amount to credit, or a negative amount to debit." })] }), _jsxs("label", { className: "block space-y-2 text-sm", children: [_jsx("span", { className: "text-on-subtle", children: "Reason" }), _jsxs("select", { value: reason, onChange: (event) => setReason(event.target.value), className: "min-h-[2.75rem] w-full border border-outline-variant/15 bg-surface-lowest px-4 text-white outline-none transition focus:border-primary-container/35", children: [_jsx("option", { value: "manual_top_up", children: "Manual top up" }), _jsx("option", { value: "manual_correction", children: "Manual correction" }), _jsx("option", { value: "fraud_reversal", children: "Fraud reversal" }), _jsx("option", { value: "promotional_credit", children: "Promotional credit" })] })] }), _jsxs("label", { className: "block space-y-2 text-sm", children: [_jsx("span", { className: "text-on-subtle", children: "Note" }), _jsx("textarea", { value: note, onChange: (event) => setNote(event.target.value), rows: 4, className: "w-full border border-outline-variant/15 bg-surface-lowest px-4 py-3 text-white outline-none transition focus:border-primary-container/35", placeholder: "Operator note for the ledger" })] }), _jsx("button", { type: "submit", className: "prismatic-button prismatic-button-primary min-h-[2.4rem] w-full px-4 text-[0.62rem]", disabled: adjustMutation.isPending, children: "Apply Wallet Adjustment" })] })] }) }), _jsx("section", { className: "prismatic-card p-6", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-white", children: "Recent Ledger" }), _jsx("div", { className: "mt-5 space-y-3", children: (auditQuery.data ?? []).slice(0, 6).map((tx) => (_jsxs("div", { className: "border-l-2 border-primary-container/35 bg-surface-lowest/80 px-4 py-3", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-primary-container", children: tx.kind }), _jsxs("p", { className: "mt-2 text-sm text-on-surface", children: [tx.user_id.slice(0, 8), "\u2026 \u2022 ", tx.amount >= 0 ? "+" : "", currencySymbol, Math.abs(tx.amount).toFixed(2)] })] }, tx.id))) })] }) })] })] })] }));
};
const MetricCard = ({ label, value }) => (_jsxs("div", { className: "border-l-2 border-primary-container bg-surface-low/85 px-5 py-5", children: [_jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle", children: label }), _jsx("p", { className: "mt-3 font-headline text-4xl font-black text-white", children: value })] }));
export default WalletAccountsPage;
