import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMarketDetail, previewWager, placeWager } from "@domains/betting/api/bettingApi";
import { useBettingRealtime } from "@domains/betting/hooks/useBettingRealtime";
import { useSession } from "@lib/auth/SessionProvider";
import { supabase } from "@lib/supabaseClient";
import { buildOutcomeIdentity } from "@domains/betting/utils/outcomeDisplay";
const MarketDetailPage = () => {
    const { marketId } = useParams();
    const queryClient = useQueryClient();
    const { user } = useSession();
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [stake, setStake] = useState("100");
    const [previewData, setPreviewData] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    const [wagerError, setWagerError] = useState(null);
    useBettingRealtime(marketId);
    const marketQuery = useQuery({
        queryKey: ["market-detail", marketId],
        queryFn: () => fetchMarketDetail(marketId),
        enabled: !!marketId
    });
    const wagerHistoryQuery = useQuery({
        queryKey: ["wager-history", marketId],
        queryFn: () => fetchWagerHistory(marketId),
        enabled: !!marketId && !!user?.id
    });
    const previewMutation = useMutation({
        mutationFn: ({ marketId, outcomeId, stake }) => previewWager(marketId, outcomeId, stake),
        onMutate: () => setStatusMessage(null),
        onSuccess: (result) => {
            setPreviewData(result);
            setStatusMessage(null);
        },
        onError: (error) => setStatusMessage(error.message)
    });
    const placeWagerMutation = useMutation({
        mutationFn: ({ marketId, outcomeId, stake, idempotencyKey }) => placeWager(marketId, outcomeId, stake, idempotencyKey),
        onMutate: () => {
            setStatusMessage(null);
            setWagerError(null);
        },
        onSuccess: () => {
            setStatusMessage("Wager placed successfully.");
            queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
            queryClient.invalidateQueries({ queryKey: ["wager-history", marketId] });
            queryClient.invalidateQueries({ queryKey: ["market-detail", marketId] });
            setPreviewData(null);
        },
        onError: (error) => setWagerError(error.message)
    });
    const market = marketQuery.data?.market;
    const outcomes = marketQuery.data?.outcomes ?? [];
    const selectedOutcomeDetail = useMemo(() => outcomes.find((o) => o.id === selectedOutcome), [outcomes, selectedOutcome]);
    const selectedOutcomeIdentity = useMemo(() => {
        if (!selectedOutcomeDetail)
            return null;
        return buildOutcomeIdentity({
            teamName: selectedOutcomeDetail.teamName ?? null,
            driverName: selectedOutcomeDetail.driverName,
            fallbackLabel: selectedOutcomeDetail.label,
            teamColor: selectedOutcomeDetail.teamColor ?? selectedOutcomeDetail.color ?? null
        });
    }, [selectedOutcomeDetail]);
    const handlePreview = () => {
        if (!marketId || !selectedOutcome) {
            setStatusMessage("Select an outcome.");
            return;
        }
        const amount = Number(stake);
        if (Number.isNaN(amount) || amount <= 0) {
            setStatusMessage("Enter a valid stake.");
            return;
        }
        previewMutation.mutate({
            marketId,
            outcomeId: selectedOutcome,
            stake: amount
        });
    };
    const handlePlaceWager = () => {
        if (!marketId || !selectedOutcome) {
            setWagerError("Select an outcome first.");
            return;
        }
        const amount = Number(stake);
        if (Number.isNaN(amount) || amount <= 0) {
            setWagerError("Enter a valid stake.");
            return;
        }
        placeWagerMutation.mutate({
            marketId,
            outcomeId: selectedOutcome,
            stake: amount,
            idempotencyKey: crypto.randomUUID()
        });
    };
    if (!marketId) {
        return _jsx("p", { className: "text-white/70", children: "Market not found." });
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-widest text-white/60", children: "Market" }), _jsx("h1", { className: "text-3xl font-semibold", children: market?.name ?? "Loading" }), _jsx("p", { className: "text-white/60", children: market?.event?.title }), _jsx("p", { className: "text-sm text-white/50", children: market?.description })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 px-6 py-4 text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Total Pool" }), _jsxs("p", { className: "text-2xl font-semibold", children: ["\u0189", market?.total_pool.toLocaleString() ?? "—"] })] })] }), _jsxs("section", { className: "grid gap-8 lg:grid-cols-[2fr,1fr]", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: outcomes.map((outcome) => {
                                    const identity = buildOutcomeIdentity({
                                        teamName: outcome.teamName ?? null,
                                        driverName: outcome.driverName,
                                        fallbackLabel: outcome.label,
                                        teamColor: outcome.teamColor ?? outcome.color ?? null
                                    });
                                    return (_jsxs("button", { onClick: () => {
                                            setSelectedOutcome(outcome.id);
                                            setPreviewData(null);
                                            setStatusMessage(null);
                                        }, className: `rounded-3xl border px-5 py-4 text-left transition hover:bg-white/10 ${selectedOutcome === outcome.id
                                            ? "border-brand bg-brand/20"
                                            : "border-white/10 bg-white/5"}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "h-3 w-3 rounded-full", style: { backgroundColor: identity.color } }), _jsxs("div", { className: "flex flex-col", children: [_jsx("p", { className: "text-lg font-semibold text-white", children: identity.primaryLabel }), identity.secondaryLabel && (_jsx("p", { className: "text-sm text-white/60", children: identity.secondaryLabel }))] })] }), _jsxs("p", { className: "mt-3 text-sm text-white/60", children: ["Pool \u0189", outcome.pool.toFixed(0)] })] }, outcome.id));
                                }) }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "My Wagers" }), _jsxs("div", { className: "mt-4 space-y-3", children: [wagerHistoryQuery.isLoading && (_jsx("p", { className: "text-sm text-white/60", children: "Loading wager history\u2026" })), wagerHistoryQuery.data?.map((wager) => {
                                                const identity = buildOutcomeIdentity({
                                                    teamName: wager.outcome_team_name,
                                                    driverName: wager.outcome_driver_name,
                                                    fallbackLabel: wager.outcome_label,
                                                    teamColor: wager.outcome_team_color
                                                });
                                                return (_jsxs("article", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: identity.color } }), _jsxs("div", { className: "flex flex-col", children: [_jsx("p", { className: "font-semibold text-white", children: identity.primaryLabel }), identity.secondaryLabel && (_jsx("p", { className: "text-xs text-white/60", children: identity.secondaryLabel }))] })] }), _jsx("p", { className: `text-xs uppercase ${statusColor(wager.status)}`, children: wager.status })] }), _jsxs("p", { className: "mt-2 text-sm font-semibold text-white", children: ["\u0189", wager.stake.toFixed(2)] }), _jsxs("p", { className: "text-xs text-white/60", children: ["Odds ", wager.effective_odds.toFixed(2), " \u00B7", " ", new Date(wager.created_at).toLocaleString()] })] }, wager.id));
                                            }), wagerHistoryQuery.data && wagerHistoryQuery.data.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No wagers yet \u2014 select an outcome and place a bet." }))] })] })] }), _jsxs("aside", { className: "rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/30", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Bet Slip" }), _jsx("p", { className: "mt-2 text-sm text-white/60", children: "Select an outcome to preview odds & payout." }), statusMessage && (_jsx("p", { className: "mt-2 text-sm text-brand", children: statusMessage })), wagerError && (_jsx("p", { className: "mt-2 text-sm text-red-400", children: wagerError })), _jsxs("form", { className: "mt-6 space-y-4", onSubmit: (event) => event.preventDefault(), children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Stake" }), _jsx("input", { type: "number", placeholder: "100", value: stake, onChange: (event) => setStake(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white focus:border-brand focus:outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsx(Stat, { label: "Baseline", value: formatOdds(previewData?.baselineOdds) }), _jsx(Stat, { label: "Effective", value: formatOdds(previewData?.effectiveOdds) }), _jsx(Stat, { label: "Price Impact", value: previewData
                                                    ? `${(previewData.priceImpact * 100).toFixed(2)}%`
                                                    : "—" }), _jsx(Stat, { label: "Payout", value: previewData ? `Ɖ${previewData.estimatedPayout.toFixed(2)}` : "—" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", className: "flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-white", onClick: handlePreview, disabled: !selectedOutcome || previewMutation.isPending, children: previewMutation.isPending ? "Previewing…" : "Preview" }), _jsx("button", { type: "button", className: "flex-1 rounded-2xl bg-brand py-3 text-center text-base font-semibold uppercase tracking-widest text-black disabled:opacity-40", onClick: handlePlaceWager, disabled: !selectedOutcome || placeWagerMutation.isPending, children: placeWagerMutation.isPending ? "Placing…" : "Place Wager" })] }), selectedOutcomeIdentity && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-white/60", children: [_jsx("span", { className: "h-2 w-2 rounded-full", style: { backgroundColor: selectedOutcomeIdentity.color } }), _jsxs("span", { children: ["You selected ", selectedOutcomeIdentity.primaryLabel, selectedOutcomeIdentity.secondaryLabel
                                                        ? ` · ${selectedOutcomeIdentity.secondaryLabel}`
                                                        : ""] })] }))] })] })] })] }));
};
const Stat = ({ label, value }) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: label }), _jsx("p", { className: "mt-1 text-lg font-semibold", children: value })] }));
const formatOdds = (value) => {
    if (value === null || value === undefined || Number.isNaN(value))
        return "—";
    return value.toFixed(2);
};
const statusColor = (status) => {
    if (status === "won")
        return "text-green-400";
    if (status === "lost")
        return "text-red-400";
    return "text-white/60";
};
const fetchWagerHistory = async (marketId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return [];
    const { data, error } = await supabase
        .from("wagers")
        .select(`
      id,
      stake,
      status,
      effective_odds,
      created_at,
      outcome:outcomes(
        label,
        color,
        metadata,
        driver:timing_drivers(
          name,
          team_name,
          primary_color
        )
      )
    `)
        .eq("user_id", user.id)
        .eq("market_id", marketId)
        .order("created_at", { ascending: false })
        .limit(20);
    if (error)
        throw error;
    return (data?.map((wager) => {
        const outcome = Array.isArray(wager.outcome) ? wager.outcome[0] : wager.outcome;
        const metadata = (outcome?.metadata ?? {});
        const driver = outcome?.driver
            ? (Array.isArray(outcome.driver) ? outcome.driver[0] : outcome.driver)
            : null;
        const driverName = driver?.name ??
            metadata.driver_name ??
            metadata.driverName ??
            outcome?.label ??
            "Unknown";
        const teamName = metadata.team_name ??
            metadata.teamName ??
            driver?.team_name ??
            null;
        const teamColor = metadata.team_color ??
            metadata.teamColor ??
            metadata.primary_color ??
            metadata.primaryColor ??
            driver?.primary_color ??
            outcome?.color ??
            null;
        return {
            id: wager.id,
            stake: Number(wager.stake),
            status: wager.status,
            effective_odds: Number(wager.effective_odds),
            created_at: wager.created_at,
            outcome_label: outcome?.label ?? "Unknown",
            outcome_driver_name: driverName,
            outcome_team_name: teamName ?? null,
            outcome_team_color: teamColor ?? null
        };
    }) ?? []);
};
export default MarketDetailPage;
