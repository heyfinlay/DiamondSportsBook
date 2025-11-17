import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
const ToastContext = createContext({
    toast: () => { },
    dismiss: () => { }
});
const DEFAULT_DURATION = 5000;
const createId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});
    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        if (timers.current[id]) {
            clearTimeout(timers.current[id]);
            delete timers.current[id];
        }
    }, []);
    const toast = useCallback((options) => {
        const id = options.id ?? createId();
        const entry = {
            ...options,
            id,
            variant: options.variant ?? "default"
        };
        setToasts((prev) => [...prev, entry]);
        if (timers.current[id]) {
            clearTimeout(timers.current[id]);
        }
        timers.current[id] = setTimeout(() => dismiss(id), options.duration ?? DEFAULT_DURATION);
    }, [dismiss]);
    useEffect(() => {
        return () => {
            Object.values(timers.current).forEach(clearTimeout);
            timers.current = {};
        };
    }, []);
    const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
    return (_jsxs(ToastContext.Provider, { value: value, children: [children, _jsx("div", { className: "pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3 px-4", children: toasts.map((toast) => (_jsx("div", { className: `pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg shadow-black/40 backdrop-blur ${toast.variant === "success"
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                        : toast.variant === "error"
                            ? "border-red-400/40 bg-red-500/10 text-red-100"
                            : "border-white/20 bg-black/70 text-white"}`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-semibold", children: toast.title }), toast.description && (_jsx("p", { className: "mt-1 text-xs text-white/80", children: toast.description }))] }), _jsx("button", { type: "button", onClick: () => dismiss(toast.id), className: "text-xs uppercase tracking-[0.2em] text-white/70 transition hover:text-white", children: "Close" })] }) }, toast.id))) })] }));
};
export const useToast = () => useContext(ToastContext);
