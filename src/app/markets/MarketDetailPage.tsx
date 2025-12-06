import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { placeWager } from "@domains/betting/api/bettingApi";
import { useBettingRealtime } from "@domains/betting/hooks/useBettingRealtime";
import { BetSlipDrawer } from "../../features/markets/BetSlipDrawer";
import { PoolAnalytics } from "../../features/markets/PoolAnalytics";
import { PoolDetails } from "../../features/markets/PoolDetails";
import { fetchUiLiveBetsForPool, fetchUiPoolById } from "../../features/markets/api";
import FinalSettlementsTable from "../../features/markets/components/FinalSettlementsTable";
import { formatCurrency } from "../../features/markets/utils/format";
import type { Pool } from "../../features/markets/types";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys, walletKeys } from "@lib/query/keys";
import { fetchPoolSettlementLedger } from "@domains/betting/api/settlementAuditApi";
import { refetchAfterBet } from "@lib/query/refetchers";
import { LIVE_BETS_POLL_INTERVAL_MS, MARKET_POLL_INTERVAL_MS } from "@config/realtime";

// Layout baseline restored from commit 9208937 (markets UI v2) while the team metadata/API work from 23eeb03 stays intact.

// v2 Markets detail page: maps v1 pool/outcome totals into the new UI components.

const MarketDetailPage = () => {
  const { marketId } = useParams();
  const queryClient = useQueryClient();
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const { user, loading: sessionLoading } = useSession();

  useBettingRealtime(marketId);

  const poolQuery = useQuery({
    queryKey: marketKeys.pool(marketId),
    queryFn: () => fetchUiPoolById(marketId!),
    enabled: !!marketId,
    refetchInterval: MARKET_POLL_INTERVAL_MS
  });

  const liveBetsQuery = useQuery({
    queryKey: marketKeys.liveBets(marketId),
    queryFn: () => fetchUiLiveBetsForPool(marketId!),
    enabled: !!marketId,
    refetchInterval: LIVE_BETS_POLL_INTERVAL_MS
  });

  const isPoolSettled = poolQuery.data?.status === "settled";

  const settlementsQuery = useQuery({
    queryKey: ["pool-ledger", marketId],
    queryFn: () => fetchPoolSettlementLedger(marketId!),
    enabled: !!marketId && isPoolSettled
  });

  type PlaceBetVariables = { poolId: string; outcomeId: string; stake: number };
  type BetContext = {
    previousBalance?: { balance: number };
    balanceKey?: ReturnType<typeof walletKeys.balance>;
  };

  const placeBetMutation = useMutation<unknown, Error, PlaceBetVariables, BetContext>({
    mutationFn: ({ poolId, outcomeId, stake }) =>
      placeWager(poolId, outcomeId, stake, crypto.randomUUID()),
    onMutate: async (variables) => {
      if (!user?.id) return {};
      const balanceKey = walletKeys.balance(user.id);
      await queryClient.cancelQueries({ queryKey: balanceKey });
      const previousBalance = queryClient.getQueryData<{ balance: number }>(balanceKey);
      if (previousBalance) {
        queryClient.setQueryData(balanceKey, {
          balance: Math.max(0, previousBalance.balance - variables.stake)
        });
      }
      return { previousBalance, balanceKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBalance && context.balanceKey) {
        queryClient.setQueryData(context.balanceKey, context.previousBalance);
      }
    },
    onSuccess: (_data, variables) => {
      refetchAfterBet(queryClient, { marketId: variables.poolId, userId: user?.id });
      setBetSlipOpen(false);
    }
  });

  const pool: Pool | null = poolQuery.data ?? null;

  const statusLabel: Record<Pool["status"], string> = {
    open: "Open",
    closing_soon: "Closing Soon",
    closed: "Closed",
    settled: "Settled"
  };

  const statusClasses: Record<Pool["status"], string> = {
    open: "bg-emerald-500/10 text-emerald-200 border-emerald-500/40",
    closing_soon: "bg-amber-500/10 text-amber-200 border-amber-500/40",
    closed: "bg-slate-700/60 text-slate-200 border-slate-600/60",
    settled: "bg-indigo-500/10 text-indigo-200 border-indigo-500/40"
  };

  if (!marketId) {
    return <p className="text-white/70">Market not found.</p>;
  }

  if (poolQuery.isLoading) {
    return <p className="text-sm text-neutral-400">Loading market…</p>;
  }

  if (!pool) {
    return <p className="text-sm text-neutral-400">Pool not available.</p>;
  }

  const handleOutcomeSelect = (outcomeId: string) => {
    setSelectedOutcomeId(outcomeId);
  };

  const handleOpenBetSlip = (poolId: string, outcomeId: string) => {
    setSelectedOutcomeId(outcomeId);
    setBetSlipOpen(true);
  };

  const settlements = settlementsQuery.data ?? [];
  const winnerRows = settlements.filter((row) => row.payout > 0);
  const winningOutcomeName = winnerRows[0]?.outcome_label ?? "Winning outcome";
  const totalPaidOut = winnerRows.reduce((sum, row) => sum + row.payout, 0);

  const renderSettlementsPanel = () => {
    if (!isPoolSettled) return null;
    if (settlementsQuery.isLoading) {
      return (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/70">
          Loading final settlements…
        </div>
      );
    }
    if (settlementsQuery.isError) {
      return (
        <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
          <p>We couldn&rsquo;t load the settlement ledger.</p>
          <button
            type="button"
            className="mt-3 rounded-full border border-red-300/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]"
            onClick={() => settlementsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <section className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total Pool</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {formatCurrency(pool.totalStake)}
            </p>
            <p className="text-xs text-white/50">Combined stakes across all outcomes</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Winning Outcome</p>
            <p className="mt-1 text-lg font-semibold text-white">{winningOutcomeName}</p>
            <p className="text-xs text-white/50">{winnerRows.length} winning bets</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Paid to winners</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">
              {formatCurrency(totalPaidOut)}
            </p>
            <p className="text-xs text-white/50">After rake distribution</p>
          </div>
        </div>
        <FinalSettlementsTable rows={settlements} />
      </section>
    );
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.35em] text-amber-200/80">Market Detail</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{pool.title}</h1>
            <p className="text-sm text-white/70">
              Explore every outcome with live odds and pool share. Click a tile to launch the bet slip.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-white/70 sm:items-end">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${statusClasses[pool.status]}`}
            >
              {statusLabel[pool.status]}
            </span>
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
              {formatCurrency(pool.totalStake)} Pool
            </span>
            <p className="text-xs text-white/50">Updated {pool.lastUpdatedLabel}</p>
          </div>
        </div>
      </header>
      {!sessionLoading && !user && <AuthCtaBanner />}

      <section className="flex flex-col gap-6">
        <PoolDetails
          pool={pool}
          liveBets={liveBetsQuery.data ?? []}
          onOutcomeSelect={handleOutcomeSelect}
          onOpenBetSlip={handleOpenBetSlip}
        />

        {isPoolSettled ? (
          renderSettlementsPanel()
        ) : (
          <PoolAnalytics pool={pool} liveBets={liveBetsQuery.data ?? []} />
        )}
      </section>

      <BetSlipDrawer
        isOpen={betSlipOpen}
        pool={pool}
        outcomes={pool.outcomes}
        selectedOutcomeId={selectedOutcomeId}
        onClose={() => setBetSlipOpen(false)}
        onSelectOutcome={handleOutcomeSelect}
        onPlaceBet={({ poolId, outcomeId, stake }) =>
          placeBetMutation.mutate({ poolId, outcomeId, stake })
        }
        isPlacing={placeBetMutation.isPending}
      />
    </div>
  );
};

export default MarketDetailPage;
