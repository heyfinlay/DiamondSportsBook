import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STATUS_MAP = {
    green: {
        title: "Track Clear",
        description: "Green Flag",
        className: "bg-emerald-600/30 border-emerald-400 text-emerald-100"
    },
    yellow: {
        title: "Double Yellow",
        description: "Slow Down, No Overtaking",
        className: "bg-amber-500/30 border-amber-300 text-amber-100"
    },
    vsc: {
        title: "Virtual Safety Car",
        description: "Maintain delta",
        className: "bg-purple-600/30 border-purple-300 text-purple-100"
    },
    sc: {
        title: "Safety Car Deployed",
        description: "Follow the safety car",
        className: "bg-orange-600/30 border-orange-300 text-orange-100"
    },
    red: {
        title: "Red Flag",
        description: "Session Stopped",
        className: "bg-red-600/30 border-red-400 text-red-100"
    },
    checkered: {
        title: "Checkered Flag",
        description: "Race Finished",
        className: "bg-white/20 border-white text-white"
    }
};
export const TrackStatusBanner = ({ status, variant = "live" }) => {
    const key = (status ?? "green").toLowerCase();
    const config = STATUS_MAP[key] ?? STATUS_MAP.green;
    const sizeClasses = variant === "live"
        ? "text-3xl sm:text-4xl"
        : "text-2xl sm:text-3xl";
    return (_jsxs("div", { className: `rounded-3xl border px-6 py-4 shadow-lg shadow-black/30 ${config.className}`, role: "status", "aria-live": "polite", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] opacity-80", children: config.title }), _jsx("p", { className: `${sizeClasses} font-semibold`, children: config.description })] }));
};
