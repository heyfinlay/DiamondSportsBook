import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { currencyLabel } from "@lib/currency";
import { formatCurrency, formatOdds, formatPercent, impliedProbabilityFromOdds } from "./utils/format";
const MIN_STAKE = 25000;
const QUICK_STAKES = [
    { label: "25K", value: 25000 },
    { label: "50K", value: 50000 },
    { label: "100K", value: 100000 },
    { label: "250K", value: 250000 },
    { label: "1M", value: 1000000 }
];
export function BetSlipDrawer({ isOpen, pool, outcomes, selectedOutcomeId, onClose, onSelectOutcome, onPlaceBet, isPlacing = false }) {
    const [stakeInput, setStakeInput] = useState("");
    const closeButtonRef = useRef(null);
    useEffect(() => {
        if (isOpen) {
            setStakeInput((prev) => (prev ? prev : MIN_STAKE.toString()));
        }
        else {
            setStakeInput("");
        }
    }, [isOpen]);
    const selectedOutcome = useMemo(() => outcomes.find((o) => o.id === selectedOutcomeId) ?? null, [outcomes, selectedOutcomeId]);
    const stakeValue = Number(stakeInput.replace(/[^\d.]/g, "")) || 0;
    const stakeValid = stakeValue >= MIN_STAKE;
    const poolClosed = pool?.status === "closed" || pool?.status === "settled";
    const payoutEstimate = useMemo(() => {
        if (!selectedOutcome || stakeValue <= 0)
            return null;
        const existingPoolTotal = Math.max(pool.totalStake ?? 0, 0);
        const existingOutcomeHandle = Math.max(selectedOutcome.diamondsStaked ?? 0, 0);
        const rakeFraction = Math.max(0, Math.min(pool.rakePercent / 100, 0.95));
        const poolAfter = existingPoolTotal + stakeValue;
        const outcomeHandleAfter = existingOutcomeHandle + stakeValue;
        if (poolAfter <= 0 || outcomeHandleAfter <= 0)
            return null;
        const distributablePool = poolAfter * (1 - rakeFraction);
        const userShareOfOutcome = stakeValue / outcomeHandleAfter;
        const estimatedPayout = userShareOfOutcome * distributablePool;
        if (!Number.isFinite(estimatedPayout)) {
            return null;
        }
        return {
            estimatedPayout,
            userShareOfOutcome
        };
    }, [pool.rakePercent, pool.totalStake, selectedOutcome, stakeValue]);
    const handlePlaceBet = () => {
        if (!pool || !selectedOutcomeId || !stakeValid || poolClosed)
            return;
        onPlaceBet?.({
            poolId: pool.id,
            outcomeId: selectedOutcomeId,
            stake: stakeValue
        });
    };
    const drawerClasses = `fixed inset-y-0 right-0 z-50 w-full max-w-md transform border-l border-white/10 bg-[#05070F] shadow-[0_0_35px_rgba(0,0,0,0.65)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`;
    useEffect(() => {
        if (isOpen) {
            closeButtonRef.current?.focus();
            document.body.style.setProperty("overflow", "hidden");
        }
        else {
            document.body.style.removeProperty("overflow");
        }
        return () => {
            document.body.style.removeProperty("overflow");
        };
    }, [isOpen]);
    if (!pool) {
        return null;
    }
    return (_jsxs(_Fragment, { children: [isOpen && (_jsx("div", { className: "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm", onClick: onClose, "aria-hidden": "true" })), _jsx("aside", { className: drawerClasses, "aria-hidden": isOpen ? undefined : true, role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "flex h-full flex-col overflow-hidden px-5 py-4 text-slate-50", children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-slate-800 pb-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-slate-400", children: "Bet Slip" }), _jsx("p", { className: "text-lg font-semibold text-white", children: pool.title })] }), _jsx("button", { type: "button", onClick: onClose, ref: closeButtonRef, className: "rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-500", children: "X" })] }), _jsx("div", { className: "flex-1 overflow-y-auto space-y-3 pr-1", children: selectedOutcome ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 p-3", children: [_jsxs("div", { className: "flex items-center justify-between text-sm text-slate-300", children: [_jsx("span", { children: "Pool Size" }), _jsx("span", { className: "font-semibold text-white", children: formatCurrency(pool.totalStake) })] }), _jsxs("div", { className: "flex items-center justify-between text-sm text-slate-300", children: [_jsx("span", { children: "Closes" }), _jsx("span", { className: "font-semibold text-white", children: pool.timeRemainingLabel })] }), _jsxs("div", { className: "mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-slate-400", children: "Selected Outcome" }), _jsx("p", { className: "mt-1 text-base font-semibold leading-tight text-white", children: selectedOutcome.teamName }), _jsx("p", { className: "text-xs text-slate-400", children: selectedOutcome.driverName }), _jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2 text-sm text-slate-200", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Odds" }), _jsx("p", { className: "font-semibold text-white", children: formatOdds(selectedOutcome.baselineOdds) })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Pool Share" }), _jsx("p", { className: "font-semibold text-white", children: formatPercent(selectedOutcome.marketShare) })] })] }), _jsxs("p", { className: "mt-1 text-xs text-slate-400", children: ["Implied probability: ", impliedProbabilityFromOdds(selectedOutcome.baselineOdds)] })] })] }), _jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-slate-400", children: "Choose Outcome" }), _jsx("div", { className: "mt-2 max-h-52 space-y-2 overflow-y-auto pr-1", children: outcomes.map((outcome) => {
                                                    const isActive = outcome.id === selectedOutcomeId;
                                                    return (_jsxs("button", { type: "button", className: `flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${isActive
                                                            ? "border-emerald-400/70 bg-emerald-500/10 text-white"
                                                            : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700"}`, onClick: () => onSelectOutcome(outcome.id), children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [outcome.teamColor && (_jsx("span", { className: "h-2 w-2 rounded-full border border-white/20", style: { backgroundColor: outcome.teamColor }, "aria-hidden": "true" })), _jsx("p", { className: "font-semibold", children: outcome.teamName })] }), _jsx("p", { className: "text-[11px] text-slate-400", children: outcome.driverName })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Odds" }), _jsx("p", { className: "font-semibold text-white", children: formatOdds(outcome.baselineOdds) }), _jsxs("p", { className: "text-[11px] text-slate-400", children: ["Share ", formatPercent(outcome.marketShare)] })] })] }, outcome.id));
                                                }) })] }), _jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 p-3", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: QUICK_STAKES.map((option) => (_jsx("button", { type: "button", className: "rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200", onClick: () => setStakeInput(option.value.toString()), children: option.label }, option.label))) }), _jsxs("div", { className: "mt-3 space-y-1", children: [_jsxs("label", { className: "text-xs uppercase tracking-[0.25em] text-slate-400", children: ["Stake (", currencyLabel, ")"] }), _jsx("input", { type: "text", inputMode: "numeric", pattern: "[0-9]*", value: stakeInput, onChange: (event) => {
                                                            const digits = event.target.value.replace(/[^\d]/g, "");
                                                            setStakeInput(digits);
                                                        }, className: "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-emerald-400/60 focus:border-emerald-400", placeholder: "Enter stake" }), _jsxs("p", { className: "text-[11px] text-slate-500", children: ["Minimum stake is ", formatCurrency(MIN_STAKE), "."] }), !stakeValid && (_jsxs("p", { className: "text-[11px] text-rose-300", children: ["Minimum stake is ", formatCurrency(MIN_STAKE), "."] }))] })] }), _jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 p-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm text-slate-200", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Your odds" }), _jsx("p", { className: "text-lg font-semibold text-white", children: formatOdds(selectedOutcome.baselineOdds) })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Probability" }), _jsx("p", { className: "font-semibold text-white", children: impliedProbabilityFromOdds(selectedOutcome.baselineOdds) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Estimated payout if this outcome wins" }), _jsx("p", { className: "text-lg font-semibold text-white", children: payoutEstimate ? formatCurrency(payoutEstimate.estimatedPayout) : "—" })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Your share after bet" }), _jsx("p", { className: "font-semibold text-white", children: payoutEstimate ? formatPercent(payoutEstimate.userShareOfOutcome) : "—" })] })] }), _jsx("p", { className: "mt-2 text-[11px] text-slate-500", children: "Estimate factors in your stake, projected pool total, and rake. Final payout may change as markets move." })] })] })) : (_jsx("div", { className: "flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-sm text-slate-400", children: "Select an outcome to start a wager." })) }), _jsx("div", { className: "pt-2", children: _jsx("button", { type: "button", className: "w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400", disabled: !selectedOutcomeId || !stakeValid || poolClosed || isPlacing, onClick: handlePlaceBet, children: isPlacing ? "Placing…" : "Place Wager" }) })] }) })] }));
}
