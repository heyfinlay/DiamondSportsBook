import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Wallet2 } from "lucide-react";
import { currencyLabel } from "@lib/currency";
import { formatCurrency, formatOdds, formatPercent, impliedProbabilityFromOdds } from "./utils/format";
import { OutcomeIdentity } from "./components/OutcomeIdentity";
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
    const selectedOutcome = useMemo(() => outcomes.find((outcome) => outcome.id === selectedOutcomeId) ?? null, [outcomes, selectedOutcomeId]);
    const stakeValue = Number(stakeInput.replace(/[^\d.]/g, "")) || 0;
    const stakeValid = stakeValue >= MIN_STAKE;
    const poolClosed = pool?.status === "closed" || pool?.status === "settled";
    const payoutEstimate = useMemo(() => {
        if (!pool || !selectedOutcome || stakeValue <= 0)
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
    }, [pool, selectedOutcome, stakeValue]);
    const handlePlaceBet = () => {
        if (!pool || !selectedOutcomeId || !stakeValid || poolClosed)
            return;
        onPlaceBet?.({
            poolId: pool.id,
            outcomeId: selectedOutcomeId,
            stake: stakeValue
        });
    };
    const drawerClasses = `fixed inset-y-0 right-0 z-50 w-full max-w-[30rem] transform border-l border-white/10 bg-surface-lowest shadow-[0_0_45px_rgba(0,0,0,0.65)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`;
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
    return (_jsxs(_Fragment, { children: [isOpen ? (_jsx("div", { className: "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm", onClick: onClose, "aria-hidden": "true" })) : null, _jsx("aside", { className: drawerClasses, "aria-hidden": isOpen ? undefined : true, role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "relative flex h-full flex-col overflow-hidden text-white", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,242,255,0.12),transparent_28%),linear-gradient(180deg,rgba(18,21,25,0.98),rgba(7,9,13,0.98))]" }), _jsxs("div", { className: "relative flex h-full flex-col overflow-hidden px-5 py-5", children: [_jsx("header", { className: "border-b border-white/8 pb-4", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Place Wager" }), _jsx("p", { className: "mt-3 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white", children: pool.title }), _jsx("p", { className: "mt-2 text-[11px] uppercase tracking-[0.22em] text-on-subtle", children: "Step 1 \u00B7 Select outcome \u2192 Step 2 \u00B7 Set stake \u2192 Step 3 \u00B7 Confirm" })] }), _jsx("button", { type: "button", onClick: onClose, ref: closeButtonRef, className: "prismatic-button prismatic-button-secondary min-h-[2.35rem] px-3 text-[0.6rem]", children: "Close" })] }) }), _jsx("div", { className: "flex-1 space-y-4 overflow-y-auto py-4 pr-1", children: selectedOutcome ? (_jsxs("div", { className: "space-y-4", children: [_jsx("section", { className: "prismatic-card p-4", children: _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "border border-white/10 bg-surface px-4 py-3", children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Pool Size" }), _jsx("p", { className: "mt-2 text-lg font-semibold text-white", children: formatCurrency(pool.totalStake) })] }), _jsxs("div", { className: "border border-white/10 bg-surface px-4 py-3", children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Closes" }), _jsx("p", { className: "mt-2 text-lg font-semibold text-white", children: pool.timeRemainingLabel })] })] }), _jsxs("div", { className: "mt-4 border border-primary-container/25 bg-surface-high px-4 py-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Selected Outcome" }), _jsx(OutcomeIdentity, { primaryLabel: selectedOutcome.primaryLabel, secondaryLabel: selectedOutcome.secondaryLabel, accentColor: selectedOutcome.accentColor, className: "mt-2", primaryClassName: "font-headline text-lg font-extrabold uppercase tracking-[0.04em] text-white", secondaryClassName: "text-[0.7rem] uppercase tracking-[0.14em] text-on-subtle" })] }), _jsxs("div", { className: "border border-white/10 bg-surface px-3 py-2 text-right", children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Odds" }), _jsx("p", { className: "mt-1 font-headline text-2xl font-extrabold text-primary-dim", children: formatOdds(selectedOutcome.baselineOdds) })] })] }), _jsxs("div", { className: "mt-4 grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Pool Share" }), _jsx("p", { className: "mt-1 text-base font-semibold text-white", children: formatPercent(selectedOutcome.marketShare) })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Probability" }), _jsx("p", { className: "mt-1 text-base font-semibold text-white", children: impliedProbabilityFromOdds(selectedOutcome.baselineOdds) })] })] })] })] }) }), _jsx("section", { className: "prismatic-card p-4", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Step 1 \u00B7 Choose Outcome" }), _jsx("div", { className: "mt-4 max-h-60 space-y-2 overflow-y-auto pr-1", children: outcomes.map((outcome) => {
                                                                const isActive = outcome.id === selectedOutcomeId;
                                                                return (_jsx("button", { type: "button", className: `w-full border px-4 py-3 text-left transition ${isActive
                                                                        ? "border-primary-container/45 bg-surface-high text-white"
                                                                        : "border-white/10 bg-surface-low/70 text-white hover:bg-surface"}`, onClick: () => onSelectOutcome(outcome.id), children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsx(OutcomeIdentity, { primaryLabel: outcome.primaryLabel, secondaryLabel: outcome.secondaryLabel, accentColor: outcome.accentColor, primaryClassName: "font-headline text-base font-extrabold uppercase tracking-[0.04em] text-white", secondaryClassName: "text-[0.68rem] uppercase tracking-[0.14em] text-on-subtle" }), _jsxs("div", { className: "shrink-0 text-right", children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Odds" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-white", children: formatOdds(outcome.baselineOdds) }), _jsxs("p", { className: "mt-1 text-[0.66rem] uppercase tracking-[0.14em] text-on-subtle", children: ["Share ", formatPercent(outcome.marketShare)] })] })] }) }, outcome.id));
                                                            }) })] }) }), _jsx("section", { className: "prismatic-card p-4", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Step 2 \u00B7 Set Stake" }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: QUICK_STAKES.map((option) => (_jsx("button", { type: "button", className: "prismatic-chip", "data-active": stakeValue === option.value, onClick: () => setStakeInput(option.value.toString()), children: option.label }, option.label))) }), _jsxs("div", { className: "mt-4 border border-white/10 bg-surface-low px-4", children: [_jsxs("label", { className: "prismatic-kicker block pt-3 text-[0.56rem]", children: ["Stake (", currencyLabel, ")"] }), _jsx("input", { type: "text", inputMode: "numeric", pattern: "[0-9]*", value: stakeInput, onChange: (event) => {
                                                                        const digits = event.target.value.replace(/[^\d]/g, "");
                                                                        setStakeInput(digits);
                                                                    }, className: "prismatic-input", placeholder: `Minimum ${formatCurrency(MIN_STAKE)}` })] }), !stakeValid ? (_jsxs("p", { className: "mt-2 text-[11px] uppercase tracking-[0.16em] text-danger", children: ["Minimum stake is ", formatCurrency(MIN_STAKE), "."] })) : null] }) }), _jsx("section", { className: "prismatic-card p-4", children: _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "prismatic-kicker text-primary-dim", children: "Step 3 \u00B7 Review" }), _jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "border border-white/10 bg-surface px-4 py-3", children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Estimated Payout" }), _jsx("p", { className: "mt-2 font-headline text-2xl font-extrabold text-white", children: payoutEstimate ? formatCurrency(payoutEstimate.estimatedPayout) : "—" })] }), _jsxs("div", { className: "border border-white/10 bg-surface px-4 py-3", children: [_jsx("p", { className: "prismatic-kicker text-[0.56rem]", children: "Your Share After Bet" }), _jsx("p", { className: "mt-2 font-headline text-2xl font-extrabold text-primary-dim", children: payoutEstimate ? formatPercent(payoutEstimate.userShareOfOutcome) : "—" })] })] }), _jsxs("div", { className: "mt-4 flex items-start gap-3 border border-white/10 bg-surface-low px-4 py-3", children: [_jsx(Wallet2, { className: "mt-0.5 h-4 w-4 text-primary-dim" }), _jsx("p", { className: "text-xs leading-6 text-on-subtle", children: "Estimates update as the pool moves. Final payout depends on total pool size and rake." })] })] }) })] })) : (_jsx("div", { className: "flex h-full flex-col items-center justify-center border border-dashed border-white/10 bg-surface-low/50 p-6 text-center text-sm text-on-subtle", children: "Select an outcome to start a wager." })) }), _jsx("div", { className: "border-t border-white/8 pt-4", children: _jsxs("button", { type: "button", className: "prismatic-button prismatic-button-primary min-h-[3.2rem] w-full px-4 disabled:cursor-not-allowed disabled:opacity-40", disabled: !selectedOutcomeId || !stakeValid || poolClosed || isPlacing, onClick: handlePlaceBet, children: [isPlacing ? "Placing…" : "Place Wager", _jsx(ArrowRight, { className: "h-4 w-4" })] }) })] })] }) })] }));
}
