import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@lib/utils/cn";
const DEFAULT_SWATCH_COLOR = "#64748b";
export const OutcomeIdentity = ({ teamName, driverName, teamColor, className, primaryClassName, secondaryClassName, hideSwatch = false, align = "start" }) => {
    const primary = teamName?.trim() || driverName?.trim() || "—";
    const normalizedDriver = driverName?.trim();
    const secondary = normalizedDriver && normalizedDriver !== primary ? normalizedDriver : null;
    return (_jsxs("div", { className: cn("flex items-center gap-2", align === "end" && "justify-end text-right", className), children: [!hideSwatch && (_jsx("span", { className: "h-2.5 w-2.5 rounded-full border border-white/20", style: { backgroundColor: teamColor ?? DEFAULT_SWATCH_COLOR }, "aria-hidden": "true" })), _jsxs("div", { className: "flex flex-col leading-tight", children: [_jsx("span", { className: cn("text-sm font-semibold text-white", primaryClassName), children: primary }), secondary ? (_jsx("span", { className: cn("text-xs text-white/60", secondaryClassName), children: secondary })) : null] })] }));
};
