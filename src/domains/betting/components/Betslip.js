import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeWager, previewWager } from "@domains/betting/api/bettingApi";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useSession } from "@lib/auth/SessionProvider";
import { useToast } from "@app/components/ToastProvider";
import { buildOutcomeIdentity } from "@domains/betting/utils/outcomeDisplay";
const QUICK_STAKES = [
    { label: "100", value: 100 },
    { label: "250", value: 250 },
    { label: "500", value: 500 },
    { label: "1K", value: 1000 }
];
const createId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
const formatDiamonds = (value) => {
    if (value >= 1000000)
        return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000)
        return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
};
export const Betslip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useSession();
    const { betslip, closeBetslip, setStake, setPreviewData } = useBettingStore((state) => ({
        betslip: state.betslip,
        closeBetslip: state.closeBetslip,
        setStake: state.setStake,
        setPreviewData: state.setPreviewData
    }));
    const { balance } = useWalletStore((state) => ({
        balance: state.balance
    }));
    useWalletBalance(user?.id);
    const [inputValue, setInputValue] = useState(() => betslip.stake > 0 ? betslip.stake.toString() : "");
    useEffect(() => {
        setInputValue(betslip.stake > 0 ? betslip.stake.toString() : "");
    }, [betslip.stake]);
    const hasSelection = Boolean(betslip.outcomeId && betslip.marketId && betslip.isOpen);
    const outcomeIdentity = useMemo(() => {
        if (!betslip.outcomeId)
            return null;
        return buildOutcomeIdentity({
            teamName: betslip.teamName,
            driverName: betslip.driverName,
            fallbackLabel: betslip.outcomeLabel ?? "Selected outcome",
            teamColor: betslip.teamColor
        });
    }, [
        betslip.driverName,
        betslip.outcomeId,
        betslip.outcomeLabel,
        betslip.teamColor,
        betslip.teamName
    ]);
    const { mutate: requestPreview, isPending: isPreviewPending } = useMutation({
        mutationFn: ({ marketId, outcomeId, stake }) => previewWager(marketId, outcomeId, stake),
        onSuccess: (result) => {
            setPreviewData(result);
        },
        onError: (error) => {
            setPreviewData(null);
            toast({
                variant: "error",
                title: "Preview failed",
                description: error.message
            });
        }
    });
    const { mutate: submitWager, isPending: isPlacing } = useMutation({
        mutationFn: ({ marketId, outcomeId, stake }) => placeWager(marketId, outcomeId, stake, createId()),
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Wager placed",
                description: "Your Diamonds are locked in. Good luck!"
            });
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions"], exact: false });
            queryClient.invalidateQueries({ queryKey: ["wager-history"], exact: false });
            queryClient.invalidateQueries({ queryKey: ["user-wagers"], exact: false });
            closeBetslip();
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Bet placement failed",
                description: error.message
            });
        }
    });
    useEffect(() => {
        if (!hasSelection) {
            setPreviewData(null);
            return;
        }
        if (!betslip.stake || betslip.stake <= 0) {
            setPreviewData(null);
            return;
        }
        const timer = setTimeout(() => {
            requestPreview({
                marketId: betslip.marketId,
                outcomeId: betslip.outcomeId,
                stake: betslip.stake
            });
        }, 400);
        return () => {
            clearTimeout(timer);
        };
    }, [
        betslip.marketId,
        betslip.outcomeId,
        betslip.stake,
        hasSelection,
        requestPreview,
        setPreviewData
    ]);
    const placeDisabled = !hasSelection ||
        !betslip.stake ||
        betslip.stake <= 0 ||
        betslip.stake > balance ||
        isPlacing;
    const statusMessage = useMemo(() => {
        if (!hasSelection)
            return "Select an outcome to begin.";
        if (!user)
            return "Sign in to place wagers.";
        if (betslip.stake > balance)
            return "Insufficient Diamonds.";
        if (betslip.stake < betslip.minStake) {
            return `Minimum stake Ɖ${betslip.minStake.toLocaleString()}`;
        }
        if (betslip.maxStake > 0 && betslip.stake > betslip.maxStake) {
            return `Maximum stake Ɖ${betslip.maxStake.toLocaleString()}`;
        }
        return null;
    }, [
        balance,
        betslip.maxStake,
        betslip.minStake,
        betslip.stake,
        hasSelection,
        user
    ]);
    const handleStakeInput = (value) => {
        setInputValue(value);
        const numeric = Number(value.replace(/[^0-9.]/g, ""));
        if (Number.isNaN(numeric)) {
            setStake(0);
            return;
        }
        setStake(numeric);
    };
    const handleQuickStake = (value) => {
        setStake(value);
        setInputValue(value.toString());
    };
    if (!betslip.isOpen) {
        return null;
    }
    return (_jsx("div", { className: "pointer-events-none fixed bottom-6 right-6 z-40 w-full max-w-md px-4 sm:px-0", children: _jsxs("div", { className: "pointer-events-auto rounded-3xl border border-white/10 bg-[#060910]/95 p-6 shadow-2xl shadow-black/40", children: [_jsxs("header", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/60", children: "Betslip" }), _jsx("h3", { className: "text-lg font-semibold", children: betslip.marketName ?? "Pick a market" }), betslip.eventTitle && (_jsx("p", { className: "text-xs text-white/50", children: betslip.eventTitle })), betslip.outcomeId && outcomeIdentity && (_jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: outcomeIdentity.color } }), _jsxs("div", { className: "flex flex-col leading-tight", children: [_jsx("span", { className: "text-sm font-semibold text-white", children: outcomeIdentity.primaryLabel }), outcomeIdentity.secondaryLabel && (_jsx("span", { className: "text-xs text-white/60", children: outcomeIdentity.secondaryLabel }))] })] }))] }), _jsx("button", { type: "button", className: "text-xs uppercase tracking-[0.3em] text-white/60 transition hover:text-white", onClick: closeBetslip, children: "Close" })] }), _jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Quick Stake" }), _jsx("div", { className: "mt-2 grid grid-cols-4 gap-2", children: QUICK_STAKES.map((stakeOption) => (_jsxs("button", { type: "button", disabled: !hasSelection || isPlacing, className: `rounded-2xl border px-3 py-2 text-sm font-semibold transition ${betslip.stake === stakeOption.value
                                            ? "border-[#9FF7D3] bg-[#9FF7D3]/10 text-[#9FF7D3]"
                                            : "border-white/20 bg-white/5 text-white hover:border-white/40"} disabled:opacity-40`, onClick: () => handleQuickStake(stakeOption.value), children: ["\u0189", stakeOption.label] }, stakeOption.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Custom Amount" }), _jsx("input", { type: "text", inputMode: "numeric", placeholder: "Enter Diamonds", className: "mt-2 w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-brand focus:outline-none", value: inputValue, onChange: (event) => handleStakeInput(event.target.value), disabled: !hasSelection || isPlacing })] }), _jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3", children: [_jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Balance" }), _jsxs("span", { className: "text-lg font-semibold", children: ["\u0189", formatDiamonds(balance)] })] }), betslip.preview ? (_jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsx(PreviewStat, { label: "Baseline", value: betslip.preview.baselineOdds, suffix: "x" }), _jsx(PreviewStat, { label: "Effective", value: betslip.preview.effectiveOdds, suffix: "x" }), _jsx(PreviewStat, { label: "Price Impact", value: betslip.preview.priceImpact * 100, suffix: "%" }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Est. Payout" }), _jsxs("p", { className: "mt-1 text-lg font-semibold", children: ["\u0189", betslip.preview.estimatedPayout.toFixed(2)] })] })] })) : (_jsx("div", { className: "rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/60", children: isPreviewPending ? "Calculating odds…" : "Preview odds will appear here." })), statusMessage && (_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-red-300", children: statusMessage })), _jsx("button", { type: "button", className: "w-full rounded-full bg-brand py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", onClick: () => {
                                if (!betslip.marketId || !betslip.outcomeId)
                                    return;
                                if (!user) {
                                    toast({
                                        variant: "error",
                                        title: "Sign in required",
                                        description: "Log in to place wagers."
                                    });
                                    return;
                                }
                                submitWager({
                                    marketId: betslip.marketId,
                                    outcomeId: betslip.outcomeId,
                                    stake: betslip.stake
                                });
                            }, disabled: placeDisabled, children: isPlacing ? "Placing…" : "Place Wager" })] })] }) }));
};
const PreviewStat = ({ label, value, suffix }) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: label }), _jsxs("p", { className: "mt-1 text-lg font-semibold", children: [Number.isFinite(value) ? value.toFixed(2) : "—", suffix] })] }));
