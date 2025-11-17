import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useSession } from "@lib/auth/SessionProvider";
import { Link } from "react-router-dom";
const WalletSummary = () => {
    const { user, loading } = useSession();
    const { data, isLoading } = useWalletBalance(user?.id);
    useWalletRealtime(user?.id ?? undefined);
    const cachedBalance = useWalletStore((state) => state.balance);
    if (!user && !loading) {
        return (_jsx("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right text-sm text-white/70", children: "Guest Mode" }));
    }
    const balance = data?.balance ?? cachedBalance ?? 0;
    const pending = loading || isLoading;
    return (_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2", children: [_jsxs("div", { className: "text-left", children: [_jsx("p", { className: "text-[0.6rem] uppercase tracking-[0.35em] text-white/60", children: "Wallet" }), _jsx("p", { className: "text-lg font-semibold text-white", children: pending ? "…" : `Ɖ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })] }), _jsx(Link, { to: "/account", className: "rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40", children: "Manage" })] }));
};
export default WalletSummary;
