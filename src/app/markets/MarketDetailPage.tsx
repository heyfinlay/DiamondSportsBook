import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { placeWager } from "@domains/betting/api/bettingApi";
import { useBettingRealtime } from "@domains/betting/hooks/useBettingRealtime";
import { BetSlipDrawer } from "../../features/markets/BetSlipDrawer";
import { PoolAnalytics } from "../../features/markets/PoolAnalytics";
import { PoolDetails } from "../../features/markets/PoolDetails";
import { fetchUiLiveBetsForPool, fetchUiPoolById } from "../../features/markets/api";
import { USE_MARKET_LAYOUT_V2 } from "../../features/markets/flags";
import { formatCurrency } from "../../features/markets/utils/format";
import type { Pool } from "../../features/markets/types";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys, walletKeys } from "@lib/query/keys";
import { refetchAfterBet } from "@lib/query/refetchers";
import { LIVE_BETS_POLL_INTERVAL_MS, MARKET_POLL_INTERVAL_MS } from "@config/realtime";

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

  const headerContent = USE_MARKET_LAYOUT_V2 ? (
    <header className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Market</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">{pool.title}</h1>
      <p className="text-sm text-white/60">{pool.timeRemainingLabel}</p>
      <p className="text-xs text-white/40">Updated {pool.lastUpdatedLabel}</p>
    </header>
  ) : (
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-white/10 bg-black/30 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Pool</p>
        <h1 className="text-3xl font-semibold text-white">{pool.title}</h1>
        <p className="text-sm text-white/60">{pool.timeRemainingLabel}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-right">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total Pool</p>
        <p className="text-2xl font-semibold text-white">{formatCurrency(pool.totalStake)}</p>
        <p className="text-xs text-white/50">Rake {pool.rakePercent.toFixed(1)}%</p>
      </div>
    </header>
  );

  return (
    <div className="space-y-8">
      {headerContent}
      {!sessionLoading && !user && <AuthCtaBanner />}

      <section className="flex flex-col gap-6">
        <PoolDetails
          pool={pool}
          liveBets={liveBetsQuery.data ?? []}
          onOutcomeSelect={handleOutcomeSelect}
          onOpenBetSlip={handleOpenBetSlip}
        />

        <PoolAnalytics pool={pool} liveBets={liveBetsQuery.data ?? []} />
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
