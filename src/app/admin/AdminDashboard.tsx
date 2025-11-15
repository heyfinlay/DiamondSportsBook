import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveDeposit,
  approveWithdrawal,
  fetchPendingDeposits,
  fetchPendingWithdrawals,
  fetchAllWalletTransactions
} from "@domains/wallet/api/walletApi";
import { useSession } from "@lib/auth/SessionProvider";

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const depositsQuery = useQuery({
    queryKey: ["admin-pending-deposits"],
    queryFn: fetchPendingDeposits
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["admin-pending-withdrawals"],
    queryFn: fetchPendingWithdrawals
  });

  const walletAuditQuery = useQuery({
    queryKey: ["admin-wallet-audit"],
    queryFn: () => fetchAllWalletTransactions(25)
  });

  const approveDepositMutation = useMutation({
    mutationFn: approveDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    }
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: approveWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    }
  });

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in with an admin account to access this dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">Admin</p>
        <h1 className="text-3xl font-semibold">Control Center</h1>
        <p className="text-sm text-white/60">
          Manage pending deposits & withdrawals. Actions require betting_admin
          permissions enforced via RLS.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Pending Deposits</h2>
        {depositsQuery.isLoading && (
          <p className="text-sm text-white/60">Loading…</p>
        )}
        <div className="mt-4 space-y-3">
          {depositsQuery.data?.map((deposit) => (
            <article
              key={deposit.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  Ɖ{deposit.amount.toFixed(2)}
                </p>
                <p className="text-xs text-white/60">
                  User {deposit.user_id.slice(0, 8)}… ·{" "}
                  {new Date(deposit.requested_at).toLocaleString()}
                </p>
              </div>
              <button
                className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
                onClick={() => approveDepositMutation.mutate(deposit.id)}
                disabled={approveDepositMutation.isPending}
              >
                Approve
              </button>
            </article>
          ))}
          {depositsQuery.data && depositsQuery.data.length === 0 && (
            <p className="text-sm text-white/60">No pending deposits.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Pending Withdrawals</h2>
        {withdrawalsQuery.isLoading && (
          <p className="text-sm text-white/60">Loading…</p>
        )}
        <div className="mt-4 space-y-3">
          {withdrawalsQuery.data?.map((withdrawal) => (
            <article
              key={withdrawal.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  Ɖ{withdrawal.amount.toFixed(2)}
                </p>
                <p className="text-xs text-white/60">
                  User {withdrawal.user_id.slice(0, 8)}… ·{" "}
                  {new Date(withdrawal.requested_at).toLocaleString()}
                </p>
              </div>
              <button
                className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
                onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                disabled={approveWithdrawalMutation.isPending}
              >
                Approve
              </button>
            </article>
          ))}
          {withdrawalsQuery.data && withdrawalsQuery.data.length === 0 && (
            <p className="text-sm text-white/60">No pending withdrawals.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-xl font-semibold">Wallet Audit Trail</h2>
        <p className="text-sm text-white/60">
          Latest ledger entries across all users for compliance review.
        </p>
        <div className="mt-4 space-y-3">
          {walletAuditQuery.isLoading && (
            <p className="text-sm text-white/60">Loading audit log…</p>
          )}
          {walletAuditQuery.data?.map((entry) => (
            <article
              key={entry.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold capitalize">{entry.kind}</p>
                <p className="text-xs text-white/60">
                  User {entry.user_id.slice(0, 8)}… ·{" "}
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-lg font-semibold">
                {entry.amount > 0 ? "+" : ""}
                Ɖ{entry.amount.toFixed(2)}
              </p>
            </article>
          ))}
          {walletAuditQuery.data && walletAuditQuery.data.length === 0 && (
            <p className="text-sm text-white/60">
              No ledger entries yet. Requests will populate here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
