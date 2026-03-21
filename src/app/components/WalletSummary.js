import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useSession } from "@lib/auth/SessionProvider";
import { Link } from "react-router-dom";
import { currencySymbol } from "@lib/currency";
import { Wallet2 } from "lucide-react";
const WalletSummary = () => {
    const { user, loading } = useSession();
    const { data, isLoading } = useWalletBalance(user?.id);
    useWalletRealtime(user?.id ?? undefined);
    const cachedBalance = useWalletStore((state) => state.balance);
    if (!user && !loading) {
        return (_jsxs("div", { className: "flex items-center justify-between border border-white/10 bg-surface px-4 py-2.5 text-right text-sm text-on-subtle", children: [_jsx("span", { className: "prismatic-kicker text-[0.62rem]", children: "Guest Mode" }), _jsx(Link, { to: "/login", className: "prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.62rem]", children: "Sign In" })] }));
    }
    const balance = data?.balance ?? cachedBalance ?? 0;
    const pending = loading || isLoading;
    return (_jsxs("div", { className: "flex w-full items-center justify-between gap-3 border border-white/10 bg-surface px-4 py-2.5", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3 text-left", children: [_jsx("div", { className: "inline-flex h-10 w-10 items-center justify-center bg-surface-high text-primary-container", children: _jsx(Wallet2, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "prismatic-kicker text-[0.58rem]", children: "Vault Balance" }), _jsx("p", { className: "truncate font-headline text-lg font-extrabold tracking-[0.05em] text-white", children: pending
                                    ? "…"
                                    : `${currencySymbol}${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })] })] }), _jsx(Link, { to: "/account", className: "prismatic-button prismatic-button-secondary min-h-[2.4rem] shrink-0 px-3 text-[0.62rem]", children: "Vault" })] }));
};
export default WalletSummary;
