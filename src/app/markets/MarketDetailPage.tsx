import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMarketDetail,
  previewWager,
  placeWager
} from "@domains/betting/api/bettingApi";
import { useBettingRealtime } from "@domains/betting/hooks/useBettingRealtime";
import { useSession } from "@lib/auth/SessionProvider";
import { supabase } from "@lib/supabaseClient";

const MarketDetailPage = () => {
  const { marketId } = useParams();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [stake, setStake] = useState("100");
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [wagerError, setWagerError] = useState<string | null>(null);

  useBettingRealtime(marketId);

  const marketQuery = useQuery({
    queryKey: ["market-detail", marketId],
    queryFn: () => fetchMarketDetail(marketId!),
    enabled: !!marketId
  });

  const wagerHistoryQuery = useQuery({
    queryKey: ["wager-history", marketId],
    queryFn: () => fetchWagerHistory(marketId!),
    enabled: !!marketId && !!user?.id
  });

  const previewMutation = useMutation({
    mutationFn: ({
      marketId,
      outcomeId,
      stake
    }: {
      marketId: string;
      outcomeId: string;
      stake: number;
    }) => previewWager(marketId, outcomeId, stake),
    onMutate: () => setStatusMessage(null),
    onSuccess: (result) => {
      setPreviewData(result);
      setStatusMessage(null);
    },
    onError: (error: Error) => setStatusMessage(error.message)
  });

  const placeWagerMutation = useMutation({
    mutationFn: ({
      marketId,
      outcomeId,
      stake,
      idempotencyKey
    }: {
      marketId: string;
      outcomeId: string;
      stake: number;
      idempotencyKey?: string;
    }) => placeWager(marketId, outcomeId, stake, idempotencyKey),
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
    onError: (error: Error) => setWagerError(error.message)
  });

  const market = marketQuery.data?.market;
  const outcomes = marketQuery.data?.outcomes ?? [];
  const selectedOutcomeDetail = useMemo(
    () => outcomes.find((o) => o.id === selectedOutcome),
    [outcomes, selectedOutcome]
  );

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
    return <p className="text-white/70">Market not found.</p>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-white/60">
            Market
          </p>
          <h1 className="text-3xl font-semibold">{market?.name ?? "Loading"}</h1>
          <p className="text-white/60">{market?.event?.title}</p>
          <p className="text-sm text-white/50">{market?.description}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/30 px-6 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Total Pool
          </p>
          <p className="text-2xl font-semibold">
            Ɖ{market?.total_pool.toLocaleString() ?? "—"}
          </p>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {outcomes.map((outcome) => (
              <button
                key={outcome.id}
                onClick={() => {
                  setSelectedOutcome(outcome.id);
                  setPreviewData(null);
                  setStatusMessage(null);
                }}
                className={`rounded-3xl border px-5 py-4 text-left transition hover:bg-white/10 ${
                  selectedOutcome === outcome.id
                    ? "border-brand bg-brand/20"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-lg font-semibold">{outcome.label}</p>
                <p className="text-sm text-white/60">
                  Pool Ɖ{outcome.pool.toFixed(0)}
                </p>
              </button>
            ))}
          </div>

          <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <h2 className="text-xl font-semibold">My Wagers</h2>
            <div className="mt-4 space-y-3">
              {wagerHistoryQuery.isLoading && (
                <p className="text-sm text-white/60">Loading wager history…</p>
              )}
              {wagerHistoryQuery.data?.map((wager) => (
                <article
                  key={wager.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <p className="font-semibold">
                    Ɖ{wager.stake.toFixed(2)} on {wager.outcome_label}
                  </p>
                  <p className="text-xs text-white/60">
                    Odds {wager.effective_odds.toFixed(2)} ·{" "}
                    {new Date(wager.created_at).toLocaleString()}
                  </p>
                  <p className={`text-xs uppercase ${statusColor(wager.status)}`}>
                    {wager.status}
                  </p>
                </article>
              ))}
              {wagerHistoryQuery.data && wagerHistoryQuery.data.length === 0 && (
                <p className="text-sm text-white/60">
                  No wagers yet — select an outcome and place a bet.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/30">
          <h2 className="text-xl font-semibold">Bet Slip</h2>
          <p className="mt-2 text-sm text-white/60">
            Select an outcome to preview odds & payout.
          </p>
          {statusMessage && (
            <p className="mt-2 text-sm text-brand">{statusMessage}</p>
          )}
          {wagerError && (
            <p className="mt-2 text-sm text-red-400">{wagerError}</p>
          )}
          <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Stake
              </label>
              <input
                type="number"
                placeholder="100"
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Baseline" value={formatOdds(previewData?.baselineOdds)} />
              <Stat label="Effective" value={formatOdds(previewData?.effectiveOdds)} />
              <Stat
                label="Price Impact"
                value={
                  previewData
                    ? `${(previewData.priceImpact * 100).toFixed(2)}%`
                    : "—"
                }
              />
              <Stat
                label="Payout"
                value={
                  previewData ? `Ɖ${previewData.estimatedPayout.toFixed(2)}` : "—"
                }
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-white"
                onClick={handlePreview}
                disabled={!selectedOutcome || previewMutation.isPending}
              >
                {previewMutation.isPending ? "Previewing…" : "Preview"}
              </button>
              <button
                type="button"
                className="flex-1 rounded-2xl bg-brand py-3 text-center text-base font-semibold uppercase tracking-widest text-black disabled:opacity-40"
                onClick={handlePlaceWager}
                disabled={!selectedOutcome || placeWagerMutation.isPending}
              >
                {placeWagerMutation.isPending ? "Placing…" : "Place Wager"}
              </button>
            </div>
            {selectedOutcomeDetail && (
              <p className="text-xs text-white/50">
                You selected {selectedOutcomeDetail.label}
              </p>
            )}
          </form>
        </aside>
      </section>
    </div>
  );
};

interface PreviewResult {
  baselineOdds: number;
  effectiveOdds: number;
  priceImpact: number;
  impliedProbability: number;
  estimatedPayout: number;
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
    <p className="mt-1 text-lg font-semibold">{value}</p>
  </div>
);

const formatOdds = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(2);
};

const statusColor = (status: string) => {
  if (status === "won") return "text-green-400";
  if (status === "lost") return "text-red-400";
  return "text-white/60";
};

interface WagerHistoryItem {
  id: string;
  stake: number;
  status: string;
  effective_odds: number;
  created_at: string;
  outcome_label: string;
}

const fetchWagerHistory = async (marketId: string): Promise<WagerHistoryItem[]> => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wagers")
    .select("id, stake, status, effective_odds, created_at, outcome:outcomes(label)")
    .eq("user_id", user.id)
    .eq("market_id", marketId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return (
    data?.map((wager) => ({
      id: wager.id,
      stake: Number(wager.stake),
      status: wager.status,
      effective_odds: Number(wager.effective_odds),
      created_at: wager.created_at,
      outcome_label: Array.isArray(wager.outcome)
        ? wager.outcome[0]?.label ?? "Unknown"
        : (wager.outcome as { label?: string } | null)?.label ?? "Unknown"
    })) ?? []
  );
};

export default MarketDetailPage;
