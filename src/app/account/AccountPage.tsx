import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@lib/auth/SessionProvider";
import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletTransactions } from "@domains/wallet/hooks/useWalletTransactions";
import {
  requestDeposit,
  requestWithdrawal
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

  const transactions = transactionsQuery.data ?? [];

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
    </div>
  );
};

export default AccountPage;
