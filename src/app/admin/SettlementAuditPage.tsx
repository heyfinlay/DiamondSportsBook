import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import {
  fetchRecentSettlements,
  fetchPoolSettlementLedger,
  fetchSettlementSummary
} from "@domains/betting/api/settlementAuditApi";
import { useSession } from "@lib/auth/SessionProvider";
import { currencySymbol } from "@lib/currency";
import { formatCurrency } from "../../features/markets/utils/format";
import FinalSettlementsTable from "../../features/markets/components/FinalSettlementsTable";

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

  const ledgerQuery = useQuery({
    queryKey: ["pool-ledger", poolId],
    queryFn: () => fetchPoolSettlementLedger(poolId!),
    enabled: !!poolId && !!user
  });

  const summaryQuery = useQuery({
    queryKey: ["pool-summary", poolId],
    queryFn: () => fetchSettlementSummary(poolId!),
    enabled: !!poolId && !!user
  });

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in to view payout details.
      </div>
    );
  }

  const payouts = ledgerQuery.data || [];
  const totalPayout = payouts.reduce((sum, p) => sum + Number(p.payout), 0);
  const winners = payouts.filter((row) => row.payout > 0);
  const summary = summaryQuery.data;

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
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Handle</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(Number(summary?.handle ?? 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Rake</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(Number(summary?.rake_amount ?? 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Paid to winners</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">
            {formatCurrency(totalPayout)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Winners</p>
          <p className="mt-1 text-2xl font-semibold">{winners.length}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Settlement Ledger</h2>
        {ledgerQuery.isLoading ? (
          <p className="mt-4 text-sm text-white/60">Loading settlement ledger…</p>
        ) : (
          <FinalSettlementsTable rows={payouts} emptyLabel="No ledger entries found." />
        )}
        {summary && (
          <p className="mt-4 text-xs text-white/60">
            Confirmed {new Date(summary.approved_at).toLocaleString()} by{" "}
            {summary.approved_by ? summary.approved_by.slice(0, 8) + "…" : "system"}
          </p>
        )}
      </section>
    </div>
  );
};
