import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { cn } from "@lib/utils/cn";
export const PrismaticSideRail = ({ title, subtitle, items, activeKey, ctaLabel, ctaTo }) => {
    return (_jsxs("aside", { className: "prismatic-card sticky top-28 hidden h-fit overflow-hidden xl:flex xl:w-[17rem] xl:flex-col", children: [_jsxs("div", { className: "border-b border-white/5 px-6 py-6", children: [_jsx("p", { className: "font-headline text-sm font-extrabold uppercase tracking-[0.14em] text-white", children: title }), _jsx("p", { className: "mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-primary-dim", children: subtitle })] }), _jsx("nav", { className: "flex flex-col py-3", children: items.map((item) => {
                    const Icon = item.icon;
                    const className = cn("flex min-h-[4rem] items-center gap-4 border-l-2 px-6 font-label text-xs uppercase tracking-[0.15em] transition", activeKey === item.key
                        ? "border-primary-container bg-surface text-primary-container"
                        : "border-transparent text-on-subtle hover:bg-surface-low hover:text-white");
                    if (item.to) {
                        return (_jsxs(Link, { to: item.to, className: className, children: [_jsx(Icon, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: item.label })] }, item.key));
                    }
                    return (_jsxs("div", { className: className, children: [_jsx(Icon, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: item.label })] }, item.key));
                }) }), _jsx("div", { className: "mt-auto border-t border-white/5 px-5 py-5", children: ctaLabel && ctaTo ? (_jsx(Link, { to: ctaTo, className: "prismatic-button prismatic-button-primary w-full", children: ctaLabel })) : null })] }));
};
export default PrismaticSideRail;
