import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import {
  fetchPoolPayouts,
  fetchRecentSettlements,
  type PoolPayout
} from "@domains/betting/api/settlementAuditApi";
import { useSession } from "@lib/auth/SessionProvider";
import { currencySymbol } from "@lib/currency";

const SettlementAuditPage = () => {
  const { user } = useSession();

  const settlementsQuery = useQuery({
    queryKey: ["recent-settlements"],
    queryFn: () => fetchRecentSettlements(50),
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in with an admin account to access settlement audit.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">Admin</p>
        <h1 className="text-3xl font-semibold">Settlement Audit Trail</h1>
        <p className="text-sm text-white/60">
          View all settled pools and payout distributions for compliance and verification.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Recent Settlements</h2>
        {settlementsQuery.isLoading && (
          <p className="mt-4 text-sm text-white/60">Loading settlements…</p>
        )}
        <div className="mt-4 space-y-3">
          {settlementsQuery.data?.map((settlement: any) => (
            <Link
              key={settlement.id}
              to={`/admin/settlements/${settlement.pool_id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {settlement.events?.title || "Unknown Event"}
                  </p>
                  <p className="text-xs text-white/60">
                    {settlement.markets?.name || "Unknown Pool"} →{" "}
                    {settlement.outcomes?.label || "Unknown Outcome"}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Settled {new Date(settlement.approved_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {`${currencySymbol}${Number(settlement.handle || 0).toFixed(2)}`} Pool
                  </p>
                  <p className="text-xs text-white/60">
                    {`${currencySymbol}${Number(settlement.rake_amount || 0).toFixed(2)}`} Rake (
                    {((Number(settlement.rake_amount || 0) / Number(settlement.handle || 1)) * 100).toFixed(1)}%)
                  </p>
                  <p className="text-xs text-white/60">
                    {`${currencySymbol}${Number(settlement.distribution_pool || 0).toFixed(2)}`} Paid
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {settlementsQuery.data && settlementsQuery.data.length === 0 && (
            <p className="text-sm text-white/60">No settlements yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettlementAuditPage;

/**
 * Detail page for a specific pool's payouts
 */
export const PoolPayoutDetailPage = () => {
  const { poolId } = useParams<{ poolId: string }>();
  const { user } = useSession();

  const payoutsQuery = useQuery({
    queryKey: ["pool-payouts", poolId],
    queryFn: () => fetchPoolPayouts(poolId!),
    enabled: !!poolId && !!user
  });

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in to view payout details.
      </div>
    );
  }

  const payouts = payoutsQuery.data || [];
  const totalPayout = payouts.reduce((sum, p) => sum + Number(p.payout), 0);
  const totalStake = payouts.reduce((sum, p) => sum + Number(p.stake), 0);

  return (
    <div className="space-y-6">
      <header>
        <Link
          to="/admin/settlements"
          className="text-sm uppercase tracking-[0.3em] text-white/60 hover:text-white"
        >
          ← Back to Settlements
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Payout Details</h1>
        <p className="text-sm text-white/60">Pool ID: {poolId}</p>
      </header>

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Winners</p>
          <p className="mt-1 text-2xl font-semibold">{payouts.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total Winning Stake</p>
          <p className="mt-1 text-2xl font-semibold">{`${currencySymbol}${totalStake.toFixed(2)}`}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total Paid Out</p>
          <p className="mt-1 text-2xl font-semibold">{`${currencySymbol}${totalPayout.toFixed(2)}`}</p>
        </div>
      </section>

      {/* Payout List */}
      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Payouts</h2>
        {payoutsQuery.isLoading && (
          <p className="mt-4 text-sm text-white/60">Loading payouts…</p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-2 font-semibold text-white/60">User</th>
                <th className="pb-2 font-semibold text-white/60">Outcome</th>
                <th className="pb-2 text-right font-semibold text-white/60">Stake</th>
                <th className="pb-2 text-right font-semibold text-white/60">Share %</th>
                <th className="pb-2 text-right font-semibold text-white/60">Payout</th>
                <th className="pb-2 text-right font-semibold text-white/60">Effective Odds</th>
                <th className="pb-2 text-right font-semibold text-white/60">Settled At</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout: PoolPayout) => (
                <tr key={payout.payout_id} className="border-b border-white/5">
                  <td className="py-3">
                    <p className="font-semibold">
                      {payout.user_display_name || `User ${payout.user_id.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-white/40">{payout.user_id.slice(0, 8)}…</p>
                  </td>
                  <td className="py-3 text-white/70">{payout.outcome_label}</td>
                  <td className="py-3 text-right">{`${currencySymbol}${Number(payout.stake).toFixed(2)}`}</td>
                  <td className="py-3 text-right text-white/70">
                    {Number(payout.share_percent).toFixed(2)}%
                  </td>
                  <td className="py-3 text-right font-semibold text-emerald-300">
                    {`${currencySymbol}${Number(payout.payout).toFixed(2)}`}
                  </td>
                  <td className="py-3 text-right text-white/70">
                    {Number(payout.effective_odds).toFixed(2)}x
                  </td>
                  <td className="py-3 text-right text-xs text-white/60">
                    {new Date(payout.settled_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payouts.length === 0 && !payoutsQuery.isLoading && (
            <p className="mt-4 text-sm text-white/60">No payouts found for this pool.</p>
          )}
        </div>
      </section>
    </div>
  );
};
