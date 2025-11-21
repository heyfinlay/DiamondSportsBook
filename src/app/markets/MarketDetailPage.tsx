import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { placeWager } from "@domains/betting/api/bettingApi";
import { BetSlipDrawer } from "../../features/markets/BetSlipDrawer";
import { PoolAnalytics } from "../../features/markets/PoolAnalytics";
import { PoolDetails } from "../../features/markets/PoolDetails";
import { fetchUiLiveBetsForPool, fetchUiPoolById } from "../../features/markets/api";
import type { Pool } from "../../features/markets/types";

// v2 Markets detail page: maps v1 pool/outcome totals into the new UI components.

const MarketDetailPage = () => {
  const { marketId } = useParams();
  const queryClient = useQueryClient();
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);

  const poolQuery = useQuery({
    queryKey: ["markets:v2-pool", marketId],
    queryFn: () => fetchUiPoolById(marketId!),
    enabled: !!marketId
  });

  const liveBetsQuery = useQuery({
    queryKey: ["markets:v2-live-bets", marketId],
    queryFn: () => fetchUiLiveBetsForPool(marketId!),
    enabled: !!marketId
  });

  const placeBetMutation = useMutation({
    mutationFn: ({
      poolId,
      outcomeId,
      stake
    }: {
      poolId: string;
      outcomeId: string;
      stake: number;
    }) => placeWager(poolId, outcomeId, stake, crypto.randomUUID()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets:v2-pool", marketId] });
      queryClient.invalidateQueries({ queryKey: ["markets:v2-live-bets", marketId] });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pool</p>
        <h1 className="text-3xl font-semibold text-white">{pool.title}</h1>
        <p className="text-sm text-slate-400">{pool.timeRemainingLabel}</p>
      </div>

      <PoolDetails
        pool={pool}
        liveBets={liveBetsQuery.data ?? []}
        onOutcomeSelect={handleOutcomeSelect}
        onOpenBetSlip={handleOpenBetSlip}
      />

      <PoolAnalytics pool={pool} liveBets={liveBetsQuery.data ?? []} />

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
      />
    </div>
  );
};

export default MarketDetailPage;
