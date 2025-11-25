import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@lib/utils/cn";
const StandingsTabs = ({ tabs, activeKey, onChange }) => {
    return (_jsx("div", { className: "flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/40 p-1 text-sm font-medium", children: tabs.map((tab) => {
            const isActive = tab.key === activeKey;
            return (_jsxs("button", { type: "button", onClick: () => onChange(tab.key), className: cn("flex flex-1 flex-col rounded-xl px-4 py-3 text-left transition md:flex-none", isActive
                    ? "bg-white text-black shadow"
                    : "text-white/70 hover:text-white"), children: [_jsx("span", { children: tab.label }), tab.subtitle ? (_jsx("span", { className: "text-xs font-normal text-white/60", children: tab.subtitle })) : null] }, tab.key));
        }) }));
};
export default StandingsTabs;
