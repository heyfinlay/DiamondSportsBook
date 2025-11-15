import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMarkets } from "@domains/betting/api/bettingApi";
const MarketsPage = () => {
    const marketsQuery = useQuery({
        queryKey: ["markets"],
        queryFn: fetchMarkets
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("header", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-widest text-white/60", children: "Betting" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Available Markets" })] }) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [marketsQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading markets\u2026" })), marketsQuery.data?.map((market) => (_jsx(Link, { to: `/market/${market.id}`, children: _jsxs("article", { className: "rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/50 p-6 shadow-lg shadow-black/30 transition hover:scale-[1.01]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-white/60", children: market.event.title }), _jsx("h2", { className: "mt-2 text-2xl font-semibold", children: market.name }), _jsx("p", { className: "text-sm text-white/60", children: market.description ?? "" }), _jsxs("div", { className: "mt-4 flex items-center justify-between text-sm", children: [_jsx("span", { className: "rounded-full bg-white/10 px-3 py-1 capitalize text-white/80", children: market.status }), _jsxs("span", { className: "text-white/70", children: ["Pool: \u0189", market.total_pool.toLocaleString()] })] })] }) }, market.id)))] })] }));
};
export default MarketsPage;
