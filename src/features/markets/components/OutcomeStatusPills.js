import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const baseClasses = "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]";
const variantClasses = {
    favourite: `${baseClasses} border-emerald-500/40 bg-emerald-500/15 text-emerald-100`,
    bestPayout: `${baseClasses} border-sky-500/40 bg-sky-500/15 text-sky-100`
};
export const OutcomeStatusPills = ({ isFavourite, isBestPayout }) => {
    if (!isFavourite && !isBestPayout) {
        return null;
    }
    return (_jsxs("div", { className: "flex flex-wrap justify-end gap-2", children: [isFavourite && _jsx("span", { className: variantClasses.favourite, children: "Favourite" }), isBestPayout && _jsx("span", { className: variantClasses.bestPayout, children: "Best payout" })] }));
};
