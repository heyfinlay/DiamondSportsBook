import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@lib/auth/SessionProvider";
import { fetchWagerById } from "@domains/betting/api/bettingApi";
import { fetchPoolSettlementLedger } from "@domains/betting/api/settlementAuditApi";
import { fetchUiPoolById } from "../../features/markets/api";
import { formatCurrency } from "../../features/markets/utils/format";
import { currencySymbol } from "@lib/currency";

const WagerDetailPage = () => {
  const { wagerId } = useParams<{ wagerId: string }>();
  const { user } = useSession();

  const wagerQuery = useQuery({
    queryKey: ["wager-detail", wagerId],
    queryFn: () => fetchWagerById(wagerId ?? ""),
    enabled: !!wagerId
  });

  const marketId = wagerQuery.data?.market_id;

  const poolQuery = useQuery({
    queryKey: ["wager-pool", marketId],
    queryFn: () => fetchUiPoolById(marketId ?? ""),
    enabled: !!marketId
  });

  const ledgerQuery = useQuery({
    queryKey: ["pool-ledger", marketId],
    queryFn: () => fetchPoolSettlementLedger(marketId ?? ""),
    enabled: !!marketId
  });

  if (!user && !wagerQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in to view wager details.
      </div>
    );
  }

  if (wagerQuery.isLoading || !wagerQuery.data) {
    return <p className="text-sm text-white/60">Loading wager…</p>;
  }

  const wager = wagerQuery.data;
  const ledgerEntry = ledgerQuery.data?.find((row) => row.wager_id === wager.id);
  const pool = poolQuery.data;
  const poolOutcome = pool?.outcomes.find((outcome) => outcome.id === wager.outcome_id);
  const totalOutcomePool =
    ledgerEntry?.total_winning_stake && ledgerEntry.total_winning_stake > 0
      ? ledgerEntry.total_winning_stake
      : poolOutcome?.diamondsStaked ?? 0;
  const sharePercent = ledgerEntry?.share_percent ?? 0;
  const payout = ledgerEntry?.payout ?? wager.settled_payout ?? 0;
  const distributionPool = ledgerEntry?.distribution_pool ?? 0;
  const totalBetsForOutcome = poolOutcome?.numBets ?? 0;
  const placedAt = new Date(wager.created_at).toLocaleString();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Wager</p>
          <h1 className="text-3xl font-semibold text-white">{wager.market?.name ?? "Market"}</h1>
          <p className="text-sm text-white/60">{wager.market?.event?.title ?? "Event"}</p>
        </div>
        <Link
          to="/wagers"
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
        >
          ← Back to wagers
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Bet Details</p>
          <div className="mt-3 space-y-2">
            <p className="text-lg font-semibold">
              {formatCurrency(wager.stake)} on {wager.outcome?.label || "Outcome"}
            </p>
            <p className="text-xs text-white/50">Placed {placedAt}</p>
            <p className="text-xs text-white/70">Status · {wager.status.replace(/_/g, " ")}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Final Odds</p>
              <p className="mt-1 text-xl font-semibold text-white">
                x{wager.effective_odds.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Outcome Pool</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatCurrency(totalOutcomePool)}
              </p>
              <p className="text-xs text-white/50">Total wagered on this result</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Payout Breakdown</p>
          {ledgerEntry ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-white/50">Pool share</p>
                <p className="text-lg font-semibold text-white">
                  {sharePercent > 0 ? `${sharePercent.toFixed(3)}%` : "0%"}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50">Distribution pool</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(distributionPool)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50">Final payout</p>
                <p className="text-2xl font-semibold text-emerald-300">
                  {formatCurrency(payout)}
                </p>
                <p className="text-xs text-white/60">
                  {sharePercent > 0
                    ? "Share × distribution pool"
                    : "Outcome did not win; stake contributed to pool"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/60">
              Settlement data will appear once race control confirms the results.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-white">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Outcome context</p>
            <h2 className="text-xl font-semibold">Where this bet landed</h2>
          </div>
          {poolOutcome && (
            <div className="text-xs text-white/60">
              {poolOutcome.numBets.toLocaleString()} bets · {formatCurrency(poolOutcome.diamondsStaked)}
            </div>
          )}
        </header>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total bets on outcome</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {totalBetsForOutcome.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Market handle</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatCurrency(pool?.totalStake ?? wager.market?.total_pool ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Rake</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {(pool?.rakePercent ?? wager.market?.rake_percent ?? 0).toFixed(2)}%
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WagerDetailPage;
