import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useBettingStore } from "@domains/betting/store/bettingStore";
const MarketsPage = () => {
    const markets = useBettingStore((state) => state.markets);
    const setMarkets = useBettingStore((state) => state.setMarkets);
    useEffect(() => {
        setMarkets([
            {
                id: "demo-1",
                name: "Race Winner",
                eventId: "demo-event",
                status: "open",
                totalPool: 12500
            }
        ]);
    }, [setMarkets]);
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("header", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-widest text-white/60", children: "Betting" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Available Markets" })] }) }), _jsx("div", { className: "grid gap-4 md:grid-cols-2", children: markets.map((market) => (_jsxs("article", { className: "rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/50 p-6 shadow-lg shadow-black/30", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-white/60", children: market.eventId }), _jsx("h2", { className: "mt-2 text-2xl font-semibold", children: market.name }), _jsxs("div", { className: "mt-4 flex items-center justify-between text-sm", children: [_jsx("span", { className: "rounded-full bg-white/10 px-3 py-1 capitalize text-white/80", children: market.status }), _jsxs("span", { className: "text-white/70", children: ["Pool: \u0189", market.totalPool.toLocaleString()] })] })] }, market.id))) })] }));
};
export default MarketsPage;
