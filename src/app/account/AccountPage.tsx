import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@lib/auth/SessionProvider";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletTransactions } from "@domains/wallet/hooks/useWalletTransactions";
import {
  requestDeposit,
  requestWithdrawal,
  fetchUserDeposits,
  fetchUserWithdrawals
} from "@domains/wallet/api/walletApi";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";

const AccountPage = () => {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("500");
  const [withdrawAmount, setWithdrawAmount] = useState("250");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const walletBalance = useWalletBalance(user?.id);
  const transactionsQuery = useWalletTransactions(user?.id);
  useWalletRealtime(user?.id ?? undefined);

  const depositMutation = useMutation({
    mutationFn: () => requestDeposit(Number(depositAmount)),
    onMutate: () => setStatusMessage(null),
    onSuccess: () => {
      setStatusMessage("Deposit requested. Awaiting admin approval.");
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-deposits", user?.id] });
    },
    onError: (error: Error) => {
      setStatusMessage(error.message);
    }
  });

  const withdrawalMutation = useMutation({
    mutationFn: () => requestWithdrawal(Number(withdrawAmount)),
    onMutate: () => setStatusMessage(null),
    onSuccess: () => {
      setStatusMessage("Withdrawal requested. Funds locked until review.");
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-withdrawals", user?.id] });
    },
    onError: (error: Error) => {
      setStatusMessage(error.message);
    }
  });

  if (!user && !loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in to manage your wallet.
      </div>
    );
  }

  const handleDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setStatusMessage("Enter a valid deposit amount.");
      return;
    }
    depositMutation.mutate();
  };

  const handleWithdrawal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setStatusMessage("Enter a valid withdrawal amount.");
      return;
    }
    withdrawalMutation.mutate();
  };

  const depositsQuery = useQuery({
    queryKey: ["user-deposits", user?.id],
    queryFn: () => fetchUserDeposits(user?.id ?? ""),
    enabled: !!user?.id
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["user-withdrawals", user?.id],
    queryFn: () => fetchUserWithdrawals(user?.id ?? ""),
    enabled: !!user?.id
  });

  const transactions = transactionsQuery.data ?? [];
  const depositEntries = depositsQuery.data ?? [];
  const withdrawalEntries = withdrawalsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">
          Wallet
        </p>
        <h1 className="text-3xl font-semibold">Account</h1>
        <p className="text-white/60">
          Current balance:{" "}
          {walletBalance.data
            ? `Ɖ${walletBalance.data.balance.toLocaleString()}`
            : walletBalance.isLoading
            ? "…"
            : "Ɖ0"}
        </p>
      </header>
      {statusMessage && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          {statusMessage}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <form
          className="rounded-3xl border border-white/10 bg-brand/10 px-6 py-5 text-white"
          onSubmit={handleDeposit}
        >
          <h3 className="text-xl font-semibold">Deposit</h3>
          <p className="text-sm text-white/80">
            Request admin-approved credit.
          </p>
          <input
            type="number"
            min="1"
            step="10"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-white/90 py-2 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50"
            disabled={depositMutation.isPending}
          >
            {depositMutation.isPending ? "Requesting…" : "Request Deposit"}
          </button>
        </form>
        <form
          className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-white"
          onSubmit={handleWithdrawal}
        >
          <h3 className="text-xl font-semibold">Withdraw</h3>
          <p className="text-sm text-white/80">
            Submit withdrawal for review.
          </p>
          <input
            type="number"
            min="1"
            step="10"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-brand py-2 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50"
            disabled={withdrawalMutation.isPending}
          >
            {withdrawalMutation.isPending ? "Submitting…" : "Request Withdrawal"}
          </button>
        </form>
      </div>
      <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        <div className="mt-4 space-y-3">
          {transactionsQuery.isLoading && (
            <p className="text-sm text-white/60">Loading transactions…</p>
          )}
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold capitalize">{tx.kind}</p>
                <p className="text-xs text-white/60">
                  {new Date(tx.created_at).toLocaleString()}
                </p>
                {renderTransactionNote(tx.meta)}
              </div>
              <p className="text-lg font-semibold">
                {tx.amount > 0 ? "+" : ""}
                Ɖ{tx.amount.toFixed(2)}
              </p>
            </div>
          ))}
          {transactions.length === 0 && !transactionsQuery.isLoading && (
            <p className="text-sm text-white/60">
              No transactions yet — request a deposit or place a wager to see
              ledger entries.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <h2 className="text-xl font-semibold">Request Status</h2>
        <p className="text-sm text-white/60">
          Track recently submitted deposits and withdrawals.
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Deposits</h3>
              {depositsQuery.isLoading && (
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Loading…
                </span>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {depositEntries.map((deposit) => (
                <article
                  key={deposit.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Ɖ{deposit.amount.toFixed(2)}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                      {formatStatus(deposit.status)}
                    </span>
                  </div>
                  <p className="text-xs text-white/60">
                    Requested {new Date(deposit.requested_at).toLocaleString()}
                  </p>
                  {deposit.approved_at && (
                    <p className="text-xs text-emerald-300">
                      Approved {new Date(deposit.approved_at).toLocaleString()}
                      {deposit.approved_by && (
                        <> · by {formatUserId(deposit.approved_by)}</>
                      )}
                    </p>
                  )}
                </article>
              ))}
              {depositEntries.length === 0 && !depositsQuery.isLoading && (
                <p className="text-sm text-white/60">No deposit requests yet.</p>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Withdrawals</h3>
              {withdrawalsQuery.isLoading && (
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Loading…
                </span>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {withdrawalEntries.map((withdrawal) => (
                <article
                  key={withdrawal.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Ɖ{withdrawal.amount.toFixed(2)}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                      {formatStatus(withdrawal.status)}
                    </span>
                  </div>
                  <p className="text-xs text-white/60">
                    Requested {new Date(withdrawal.requested_at).toLocaleString()}
                  </p>
                  {withdrawal.processed_at && (
                    <p className="text-xs text-white/60">
                      Reviewed {new Date(withdrawal.processed_at).toLocaleString()}
                      {withdrawal.processed_by && (
                        <> · by {formatUserId(withdrawal.processed_by)}</>
                      )}
                    </p>
                  )}
                  {withdrawal.admin_note && (
                    <p className="text-xs text-red-300">
                      Note: {withdrawal.admin_note}
                    </p>
                  )}
                </article>
              ))}
              {withdrawalEntries.length === 0 && !withdrawalsQuery.isLoading && (
                <p className="text-sm text-white/60">No withdrawal requests yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const formatStatus = (status: string) => {
  if (!status) return "Unknown";
  const normalized = status.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const renderTransactionNote = (meta: Record<string, unknown> | null | undefined) => {
  if (!meta) return null;
  const reason = typeof meta.reason === "string" ? meta.reason : null;
  const note = typeof meta.note === "string" ? meta.note : null;
  if (!reason && !note) return null;
  return (
    <>
      {reason && <p className="text-xs text-white/60">Reason: {reason}</p>}
      {note && <p className="text-xs text-white/60">Note: {note}</p>}
    </>
  );
};

const formatUserId = (value: string) => {
  if (!value) return "unknown";
  return `${value.slice(0, 6)}…`;
};

export default AccountPage;
