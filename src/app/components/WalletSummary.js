import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
import { useSession } from "@lib/auth/SessionProvider";
const WalletSummary = () => {
    const { user, loading } = useSession();
    const { data, isLoading } = useWalletBalance(user?.id);
    useWalletRealtime(user?.id ?? undefined);
    if (!user && !loading) {
        return (_jsx("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right text-sm text-white/70", children: "Guest Mode" }));
    }
    const balance = data?.balance ?? 0;
    const pending = loading || isLoading;
    return (_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Balance" }), _jsx("p", { className: "text-lg font-semibold", children: pending ? "…" : `Ɖ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })] }));
};
export default WalletSummary;
