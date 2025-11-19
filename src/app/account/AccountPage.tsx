import { useEffect, useState, type FormEvent } from "react";
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
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useUserWagers } from "@domains/betting/hooks/useUserWagers";
import { useToast } from "@app/components/ToastProvider";
import { fetchUserProfile, updateUserProfile } from "@domains/profile/api/profileApi";

const AccountPage = () => {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const walletStoreBalance = useWalletStore((state) => state.balance);
  const [depositAmount, setDepositAmount] = useState("500");
  const [withdrawAmount, setWithdrawAmount] = useState("250");
  const [username, setUsername] = useState("");
  const [icPhoneNumber, setIcPhoneNumber] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const walletBalance = useWalletBalance(user?.id);
  const transactionsQuery = useWalletTransactions(user?.id);
  const wagersQuery = useUserWagers(user?.id);
  useWalletRealtime(user?.id ?? undefined);

  const profileQuery = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => fetchUserProfile(user?.id ?? ""),
    enabled: !!user?.id
  });

  // Initialize form fields when profile data loads
  useEffect(() => {
    if (profileQuery.data) {
      setUsername(profileQuery.data.username ?? "");
      setIcPhoneNumber(profileQuery.data.ic_phone_number ?? "");
    }
  }, [profileQuery.data]);

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

  const currentBalance = walletBalance.data?.balance ?? walletStoreBalance ?? 0;
  const isWalletLoading = walletBalance.isLoading || walletBalance.isRefetching;

  const depositMutation = useMutation({
    mutationFn: () => requestDeposit(Number(depositAmount)),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Deposit requested",
        description: "An admin will review and credit your Diamonds shortly."
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-deposits", user?.id] });
      setDepositAmount("500");
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Deposit failed",
        description: error.message
      });
    }
  });

  const withdrawalMutation = useMutation({
    mutationFn: () => requestWithdrawal(Number(withdrawAmount)),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Withdrawal requested",
        description: "Funds are locked until race control approves the request."
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-withdrawals", user?.id] });
      setWithdrawAmount("250");
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Withdrawal failed",
        description: error.message
      });
    }
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      updateUserProfile(user?.id ?? "", {
        username: username.trim() || undefined,
        ic_phone_number: icPhoneNumber.trim() || undefined
      }),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Profile updated",
        description: "Your display name and IC phone number have been saved."
      });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      setIsEditingProfile(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Update failed",
        description: error.message
      });
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

    // Check for IC phone number requirement
    if (!profileQuery.data?.ic_phone_number) {
      toast({
        variant: "error",
        title: "Phone number required",
        description: "Please add your IC phone number in the profile section above before requesting a deposit."
      });
      setIsEditingProfile(true);
      return;
    }

    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      toast({
        variant: "error",
        title: "Invalid amount",
        description: "Enter a positive deposit amount."
      });
      return;
    }
    depositMutation.mutate();
  };

  const handleWithdrawal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Check for IC phone number requirement
    if (!profileQuery.data?.ic_phone_number) {
      toast({
        variant: "error",
        title: "Phone number required",
        description: "Please add your IC phone number in the profile section above before requesting a withdrawal."
      });
      setIsEditingProfile(true);
      return;
    }

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({
        variant: "error",
        title: "Invalid amount",
        description: "Enter a positive withdrawal amount."
      });
      return;
    }
    withdrawalMutation.mutate();
  };

  const handleProfileUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    profileMutation.mutate();
  };

  const transactions = transactionsQuery.data ?? [];
  const depositEntries = depositsQuery.data ?? [];
  const withdrawalEntries = withdrawalsQuery.data ?? [];
  const wagers = wagersQuery.data ?? [];

  const balanceDisplay = useMemo(() => {
    if (isWalletLoading) return "…";
    return `Ɖ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }, [currentBalance, isWalletLoading]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/40 p-6 shadow-lg shadow-black/40">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Wallet</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Account</h1>
            <p className="text-sm text-white/60">
              Linked email: <span className="font-mono">{user?.email ?? "Loading…"}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-black/30 px-6 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Available Diamonds</p>
            <p className="text-3xl font-semibold text-white">{balanceDisplay}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Profile</p>
            <h2 className="text-xl font-semibold text-white">Display Settings</h2>
          </div>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="text-xs uppercase tracking-[0.3em] text-brand transition hover:text-white"
            >
              Edit
            </button>
          )}
        </div>
        {isEditingProfile ? (
          <form onSubmit={handleProfileUpdate} className="mt-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Display Name
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                IC Phone Number
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                value={icPhoneNumber}
                onChange={(e) => setIcPhoneNumber(e.target.value)}
                placeholder="In-character phone number"
              />
              <p className="mt-1 text-xs text-white/50">
                Required for deposit and withdrawal requests
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername(profileQuery.data?.username ?? "");
                  setIcPhoneNumber(profileQuery.data?.ic_phone_number ?? "");
                  setIsEditingProfile(false);
                }}
                className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Display Name</p>
              <p className="mt-1 text-white">
                {profileQuery.data?.username || (
                  <span className="text-white/40">Not set</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">IC Phone Number</p>
              <p className="mt-1 text-white">
                {profileQuery.data?.ic_phone_number || (
                  <span className="text-white/40">Not set (required for deposits/withdrawals)</span>
                )}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
        <form
          onSubmit={handleDeposit}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Add Diamonds</p>
          <h3 className="mt-2 text-xl font-semibold">Request Deposit</h3>
          <p className="text-sm text-white/70">
            Submit for manual approval. Credits appear once racing ops confirms.
          </p>
          <input
            type="number"
            min="1"
            step="10"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            value={depositAmount}
            onChange={(event) => setDepositAmount(event.target.value)}
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-white/90 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
            disabled={depositMutation.isPending}
          >
            {depositMutation.isPending ? "Requesting…" : "Request Deposit"}
          </button>
        </form>

        <form
          onSubmit={handleWithdrawal}
          className="rounded-3xl border border-white/10 bg-black/40 p-6 text-white"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Cash Out</p>
          <h3 className="mt-2 text-xl font-semibold">Request Withdrawal</h3>
          <p className="text-sm text-white/70">Funds are held until administrators complete review.</p>
          <input
            type="number"
            min="1"
            step="10"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white"
            value={withdrawAmount}
            onChange={(event) => setWithdrawAmount(event.target.value)}
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-brand py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
            disabled={withdrawalMutation.isPending}
          >
            {withdrawalMutation.isPending ? "Submitting…" : "Request Withdrawal"}
          </button>
        </form>

        <div className="rounded-3xl border border-dashed border-white/15 bg-transparent p-6 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Heads up</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Deposits/withdrawals require marshal approval for compliance.</li>
            <li>Wagers immediately debit Diamonds and appear in the ledger.</li>
            <li>Need help? Ping race control on the admin channel.</li>
          </ul>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Ledger</p>
              <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
            </div>
            {transactionsQuery.isLoading && (
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Syncing…</span>
            )}
          </header>
          <div className="mt-5 space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold capitalize text-white">{tx.kind}</p>
                  <p className="text-xs text-white/60">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                  {renderTransactionNote(tx.meta)}
                </div>
                <p className={`text-lg font-semibold ${tx.amount >= 0 ? "text-emerald-300" : "text-white"}`}>
                  {tx.amount > 0 ? "+" : ""}
                  Ɖ{tx.amount.toFixed(2)}
                </p>
              </div>
            ))}
            {!transactions.length && !transactionsQuery.isLoading && (
              <p className="text-sm text-white/60">
                No transactions yet — request a deposit or place a wager to see ledger entries.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Activity</p>
              <h2 className="text-xl font-semibold text-white">My Wagers</h2>
            </div>
            {wagersQuery.isLoading && (
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Loading…</span>
            )}
          </header>
          <div className="mt-5 space-y-3">
            {wagers.map((wager) => (
              <div
                key={wager.id}
                className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                  <span>{wager.market_type || "Market"}</span>
                  <span>{formatStatus(wager.status)}</span>
                </div>
                <p className="mt-1 text-base font-semibold">
                  Ɖ{wager.stake.toFixed(2)} on {wager.outcome_label}
                </p>
                <p className="text-xs text-white/60">
                  {wager.market_name} · {wager.event_title}
                </p>
                <p className="text-xs text-white/60">
                  Odds {wager.effective_odds.toFixed(2)} · {new Date(wager.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {!wagers.length && !wagersQuery.isLoading && (
              <p className="text-sm text-white/60">No wagers yet. Select a market to place your first bet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Requests</p>
            <h2 className="text-xl font-semibold text-white">Deposit & withdrawal status</h2>
          </div>
          <div className="text-xs text-white/50">
            Auto-refreshes whenever an admin updates your request.
          </div>
        </header>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RequestList
            title="Deposits"
            isLoading={depositsQuery.isLoading}
            entries={depositEntries.map((entry) => ({
              id: entry.id,
              amount: entry.amount,
              status: entry.status,
              requested_at: entry.requested_at,
              resolved_at: entry.approved_at,
              resolved_by: entry.approved_by
            }))}
          />
          <RequestList
            title="Withdrawals"
            isLoading={withdrawalsQuery.isLoading}
            entries={withdrawalEntries.map((entry) => ({
              id: entry.id,
              amount: entry.amount,
              status: entry.status,
              requested_at: entry.requested_at,
              resolved_at: entry.processed_at,
              resolved_by: entry.processed_by
            }))}
          />
        </div>
      </section>
    </div>
  );
};

const RequestList = ({
  title,
  entries,
  isLoading
}: {
  title: string;
  entries: Array<{
    id: string;
    amount: number;
    status: string;
    requested_at: string;
    resolved_at: string | null;
    resolved_by: string | null;
  }>;
  isLoading: boolean;
}) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {isLoading && (
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">Loading…</span>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-semibold">Ɖ{entry.amount.toFixed(2)}</p>
              <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                {formatStatus(entry.status)}
              </span>
            </div>
            <p className="text-xs text-white/60">
              Requested {new Date(entry.requested_at).toLocaleString()}
            </p>
            {entry.resolved_at && (
              <p className="text-xs text-emerald-300">
                Cleared {new Date(entry.resolved_at).toLocaleString()}
                {entry.resolved_by && <> · by {formatUserId(entry.resolved_by)}</>}
              </p>
            )}
          </article>
        ))}
        {!entries.length && !isLoading && (
          <p className="text-sm text-white/60">No {title.toLowerCase()} yet.</p>
        )}
      </div>
    </div>
  );
};

const renderTransactionNote = (meta?: Record<string, unknown> | null) => {
  if (!meta) return null;
  const typed = meta as {
    market_id?: unknown;
    outcome_id?: unknown;
    reason?: unknown;
  };
  if (typeof typed.market_id === "string" && typeof typed.outcome_id === "string") {
    return <p className="text-xs text-white/50">Market #{typed.market_id.slice(0, 6)}…</p>;
  }
  if (typeof typed.reason === "string") {
    return <p className="text-xs text-white/50">{typed.reason}</p>;
  }
  return null;
};

const formatStatus = (status: string) => {
  return status ? status.replace(/_/g, " ") : "pending";
};

const formatUserId = (id: string) => `${id.slice(0, 6)}…`;

export default AccountPage;
