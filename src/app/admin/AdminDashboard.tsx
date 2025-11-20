import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  approveDeposit,
  approveWithdrawal,
  fetchPendingDeposits,
  fetchPendingWithdrawals,
  fetchAllWalletTransactions,
  rejectWithdrawal
} from "@domains/wallet/api/walletApi";
import { useSession } from "@lib/auth/SessionProvider";
import { useToast } from "@app/components/ToastProvider";

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { toast } = useToast();

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
      toast({
        variant: "success",
        title: "Deposit approved",
        description: "User wallet has been credited."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to approve deposit",
        description: error.message
      });
    }
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: approveWithdrawal,
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Withdrawal approved",
        description: "Funds marked as processed."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to approve withdrawal",
        description: error.message
      });
    }
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectWithdrawal(id, reason),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Withdrawal rejected",
        description: "User has been notified and funds were returned."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to reject withdrawal",
        description: error.message
      });
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
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Admin</p>
          <h1 className="text-3xl font-semibold">Control Center</h1>
          <p className="text-sm text-white/60">
            Manage pending deposits & withdrawals. Actions require betting_admin
            permissions enforced via RLS.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row">
          <Link
            to="/admin/settlements"
            className="inline-block rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white hover:border-white/60"
          >
            Settlement Audit
          </Link>
          <Link
            to="/admin/timing-sessions"
            className="inline-block rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white hover:border-white/60"
          >
            Manage Sessions
          </Link>
          <Link
            to="/admin/session-setup"
            className="inline-block rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:bg-brand/90"
          >
            + Create Session
          </Link>
        </div>
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
                  {deposit.display_name ||
                    deposit.username ||
                    `User ${deposit.user_id.slice(0, 8)}…`}
                  {deposit.ic_phone_number && ` · ${deposit.ic_phone_number}`}
                </p>
                <p className="text-xs text-white/40">
                  UUID: {deposit.user_id.slice(0, 8)}… ·{" "}
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
                  {withdrawal.display_name ||
                    withdrawal.username ||
                    `User ${withdrawal.user_id.slice(0, 8)}…`}
                  {withdrawal.ic_phone_number && ` · ${withdrawal.ic_phone_number}`}
                </p>
                <p className="text-xs text-white/40">
                  UUID: {withdrawal.user_id.slice(0, 8)}… ·{" "}
                  {new Date(withdrawal.requested_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
                  onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                  disabled={approveWithdrawalMutation.isPending}
                >
                  Approve
                </button>
                <button
                  className="rounded-full border border-red-400/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-300 disabled:opacity-50"
                  onClick={() => {
                    const confirmed = window.confirm(
                      "Reject withdrawal and refund the wallet balance?"
                    );
                    if (!confirmed) return;
                    const reason =
                      window.prompt("Reason for rejection?", "Manual review") ?? "";
                    rejectWithdrawalMutation.mutate({
                      id: withdrawal.id,
                      reason: reason.trim()
                    });
                  }}
                  disabled={rejectWithdrawalMutation.isPending}
                >
                  Reject
                </button>
              </div>
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
