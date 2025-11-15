import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useWalletStore } from "@domains/wallet/store/walletStore";
const WalletSummary = () => {
    const balance = useWalletStore((state) => state.balance);
    return (_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-widest text-white/60", children: "Balance" }), _jsxs("p", { className: "text-lg font-semibold", children: ["\u0189", balance.toLocaleString(undefined, { minimumFractionDigits: 2 })] })] }));
};
export default WalletSummary;
