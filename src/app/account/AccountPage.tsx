import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, LockKeyhole, ShieldCheck } from "lucide-react";
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
import { fetchUserProfile } from "@domains/profile/api/profileApi";
import { currencyLabel, currencySymbol } from "@lib/currency";
import { walletKeys } from "@lib/query/keys";

const currencyLabelTitle = currencyLabel.charAt(0).toUpperCase() + currencyLabel.slice(1);

type LedgerFilter = "all" | "credits" | "debits";

const AccountPage = () => {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const walletStoreBalance = useWalletStore((state) => state.balance);
  const [depositAmount, setDepositAmount] = useState("500");
  const [withdrawAmount, setWithdrawAmount] = useState("250");
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");

  const walletBalance = useWalletBalance(user?.id);
  const transactionsQuery = useWalletTransactions(user?.id);
  const wagersQuery = useUserWagers(user?.id);
  useWalletRealtime(user?.id ?? undefined);

  const profileQuery = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => fetchUserProfile(user?.id ?? ""),
    enabled: !!user?.id
  });

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
        description: `An admin will review and credit your ${currencyLabel} shortly.`
      });
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions(user?.id) });
      queryClient.invalidateQueries({ queryKey: walletKeys.balance(user?.id) });
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
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions(user?.id) });
      queryClient.invalidateQueries({ queryKey: walletKeys.balance(user?.id) });
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

  const handleDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profileQuery.data?.ic_number) {
      toast({
        variant: "error",
        title: "IC number required",
        description: "Add your IC number from Account Settings before requesting a deposit."
      });
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

    if (!profileQuery.data?.ic_number) {
      toast({
        variant: "error",
        title: "IC number required",
        description: "Add your IC number from Account Settings before requesting a withdrawal."
      });
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

  const transactions = transactionsQuery.data ?? [];
  const depositEntries = depositsQuery.data ?? [];
  const withdrawalEntries = withdrawalsQuery.data ?? [];
  const wagers = wagersQuery.data ?? [];

  const pendingDeposits = depositEntries.filter((entry) => entry.status !== "approved");
  const pendingWithdrawals = withdrawalEntries.filter((entry) => entry.status !== "processed");
  const totalWagers = wagers.length;
  const totalWon = wagers.filter((wager) => wager.status === "won").length;
  const totalLost = wagers.filter((wager) => wager.status === "lost").length;
  const pendingAmount = [...pendingDeposits, ...pendingWithdrawals].reduce((sum, entry) => sum + entry.amount, 0);
  const inPlayAmount = wagers
    .filter((wager) => !["won", "lost", "void_refund", "refunded"].includes(wager.status))
    .reduce((sum, wager) => sum + wager.stake, 0);
  const netChange = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const progressValue = Math.min(
    100,
    (user ? 36 : 0) +
      (profileQuery.data?.ic_number ? 34 : 0) +
      (transactions.length ? 15 : 0) +
      (wagers.length ? 15 : 0)
  );
  const tierTitle = profileQuery.data?.ic_number ? "Diamond Elite" : "Verification Pending";
  const tierSubtitle = profileQuery.data?.ic_number
    ? "Accessing priority institutional clearing"
    : "Add your IC number to unlock request routing";
  const lastSession = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Awaiting login";
  const authStatus = user ? "Encrypted" : "Guest";
  const activeDisbursal = pendingWithdrawals[0] ?? null;

  const balanceDisplay = useMemo(() => {
    if (isWalletLoading) return "…";
    return `${currencySymbol}${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }, [currentBalance, isWalletLoading]);

  const ledgerRows = useMemo(() => {
    if (ledgerFilter === "credits") return transactions.filter((tx) => tx.amount > 0);
    if (ledgerFilter === "debits") return transactions.filter((tx) => tx.amount < 0);
    return transactions;
  }, [ledgerFilter, transactions]);
  const showGuestOnly = !user && !loading;

  return (
    <div className="space-y-8">
      {showGuestOnly ? (
        <section className="prismatic-card p-8 text-center">
          <p className="font-headline text-2xl font-extrabold uppercase tracking-[0.08em] text-white">
            Guest Vault
          </p>
          <p className="mt-3 text-sm text-on-subtle">
            Sign in to manage your balance, funding requests, and wager ledger.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/login?mode=signin" className="prismatic-button prismatic-button-primary">
              Sign In
            </Link>
          </div>
        </section>
      ) : null}

      {showGuestOnly ? null : (
        <>
      <section className="grid gap-1 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <div className="prismatic-card px-8 py-10 md:px-10">
          <div className="relative z-10">
            <p className="prismatic-kicker">Total Net Liquidity</p>
            <div className="mt-6 flex flex-wrap items-end gap-4">
              <span className="font-headline text-5xl font-extrabold tracking-tight text-white md:text-7xl">
                {balanceDisplay}
              </span>
              <span className={`pb-3 text-sm font-semibold ${netChange >= 0 ? "text-primary-dim" : "text-danger"}`}>
                {netChange >= 0 ? "+" : ""}
                {currencySymbol}
                {Math.abs(netChange).toFixed(2)}
              </span>
            </div>

            <div className="mt-12 grid gap-8 border-t border-outline-variant/10 pt-8 sm:grid-cols-3">
              <Metric label="Available" value={balanceDisplay} />
              <Metric label="In-Play" value={`${currencySymbol}${inPlayAmount.toFixed(2)}`} />
              <Metric label="Pending" value={`${currencySymbol}${pendingAmount.toFixed(2)}`} muted />
            </div>
          </div>
        </div>

        <div className="prismatic-card px-8 py-10">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="prismatic-kicker">Security Tier</p>
              <div className="mt-8 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary-container" />
                <span className="font-headline text-3xl font-extrabold uppercase tracking-[0.08em] text-white">
                  {tierTitle}
                </span>
              </div>
              <p className="mt-4 text-sm text-on-subtle">{tierSubtitle}</p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                <span>Progression To Obsidian</span>
                <span className="text-white">{progressValue}%</span>
              </div>
              <div className="h-[2px] bg-surface-highest">
                <div className="h-full bg-primary-container" style={{ width: `${progressValue}%` }} />
              </div>
              <a href="#withdraw-request" className="prismatic-button prismatic-button-primary w-full">
                Withdrawal Request
              </a>
            </div>
          </div>
        </div>
      </section>

      {!profileQuery.isLoading && !profileQuery.data?.ic_number ? (
        <div className="border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger">
          Add your IC number in{" "}
          <Link to="/account/settings" className="underline underline-offset-4">
            Account Settings
          </Link>{" "}
          to unlock deposit and withdrawal requests.
        </div>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)]">
        <div className="prismatic-glass p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="prismatic-kicker">Active Disbursals</h2>
            <span className="border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-primary-dim">
              {pendingWithdrawals.length} Pending
            </span>
          </div>
          <div className="mt-8 border border-white/10 bg-surface-lowest/60 p-4">
            {activeDisbursal ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center bg-surface-highest text-on-subtle">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{currencySymbol}{activeDisbursal.amount.toFixed(2)}</p>
                    <p className="text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                      Settlement To Bank
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-headline text-sm font-bold uppercase tracking-[0.12em] text-primary-dim">
                    Processing
                  </p>
                  <p className="mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                    Requested {new Date(activeDisbursal.requested_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-on-subtle">No active withdrawals. Approved cashouts appear here.</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <MetaCard
            icon={<LockKeyhole className="h-5 w-5 text-outline" />}
            label="Last Session"
            value={lastSession}
          />
          <MetaCard
            icon={<ShieldCheck className="h-5 w-5 text-outline" />}
            label="Auth Status"
            value={authStatus}
            tone="text-primary-dim"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <SummaryTile label="Pending Deposits" value={pendingDeposits.length.toString()} />
        <SummaryTile label="Pending Withdrawals" value={pendingWithdrawals.length.toString()} />
        <SummaryTile label="Total Wagers" value={totalWagers.toString()} />
        <SummaryTile label="Win / Loss" value={`${totalWon} / ${totalLost}`} />
      </section>

      <section className="prismatic-card p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6">
          <h2 className="prismatic-kicker text-white">Ledger History</h2>
          <div className="flex gap-4">
            {[
              { key: "all" as const, label: "All Activity" },
              { key: "credits" as const, label: "Credits" },
              { key: "debits" as const, label: "Debits" }
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setLedgerFilter(option.key)}
                className={`pb-1 text-[0.68rem] uppercase tracking-[0.16em] ${
                  ledgerFilter === option.key
                    ? "border-b border-white text-white"
                    : "text-on-subtle transition hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="prismatic-table min-w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left">Transaction ID</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Details</th>
                <th className="px-6 py-4 text-left">Date / Time</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-6 py-5 text-sm text-on-subtle">#{tx.id.slice(0, 8)}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex border px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] ${tx.amount >= 0 ? "border-primary-container/25 bg-primary-container/10 text-primary-dim" : "border-white/10 bg-white/5 text-on-subtle"}`}>
                      {formatStatus(tx.kind)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-base text-white">{renderTransactionLabel(tx.kind, tx.meta)}</p>
                      {renderTransactionNote(tx.meta)}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-on-subtle">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className={`px-6 py-5 text-right text-2xl font-bold ${tx.amount >= 0 ? "text-white" : "text-on-subtle"}`}>
                    {tx.amount > 0 ? "+" : ""}
                    {currencySymbol}
                    {Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!ledgerRows.length && !transactionsQuery.isLoading ? (
            <p className="px-6 py-8 text-sm text-on-subtle">
              No transactions yet. Request a deposit or place a wager to see ledger entries.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="prismatic-card p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="prismatic-kicker text-primary-dim">Vault Actions</p>
                <h2 className="mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white">
                  Funding Requests
                </h2>
              </div>
              <Link to="/account/settings" className="prismatic-button prismatic-button-secondary text-[0.62rem]">
                Account Settings
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form onSubmit={handleDeposit} className="border border-white/10 bg-surface px-5 py-5">
                <p className="prismatic-kicker">Add {currencyLabelTitle}</p>
                <h3 className="mt-3 font-headline text-xl font-extrabold uppercase tracking-[0.05em] text-white">
                  Request Deposit
                </h3>
                <p className="mt-2 text-sm text-on-subtle">Manual approval required.</p>
                <input
                  type="number"
                  min="1"
                  step="any"
                  inputMode="decimal"
                  className="prismatic-input mt-4"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                />
                <button type="submit" className="prismatic-button prismatic-button-secondary mt-5 w-full" disabled={depositMutation.isPending}>
                  {depositMutation.isPending ? "Requesting" : "Submit Deposit"}
                </button>
              </form>

              <form id="withdraw-request" onSubmit={handleWithdrawal} className="border border-white/10 bg-surface px-5 py-5">
                <p className="prismatic-kicker">Cash Out</p>
                <h3 className="mt-3 font-headline text-xl font-extrabold uppercase tracking-[0.05em] text-white">
                  Request Withdrawal
                </h3>
                <p className="mt-2 text-sm text-on-subtle">Funds remain locked until review completes.</p>
                <input
                  type="number"
                  min="1"
                  step="any"
                  inputMode="decimal"
                  className="prismatic-input mt-4"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                />
                <button type="submit" className="prismatic-button prismatic-button-primary mt-5 w-full" disabled={withdrawalMutation.isPending}>
                  {withdrawalMutation.isPending ? "Submitting" : "Submit Withdrawal"}
                </button>
              </form>
            </div>
          </div>

          <div className="prismatic-card p-6">
            <div className="mb-5">
              <p className="prismatic-kicker text-primary-dim">Requests</p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white">
                Deposit & Withdrawal Status
              </h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
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
          </div>
        </div>

        <div className="prismatic-card p-6">
          <div className="mb-5">
            <p className="prismatic-kicker text-primary-dim">Activity</p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white">
              My Wagers
            </h2>
          </div>
          <div className="space-y-3">
            {wagers.map((wager) => (
              <div key={wager.id} className="border border-white/10 bg-surface px-4 py-4 text-sm text-white">
                <div className="flex items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                  <span>{wager.market_type.replace(/_/g, " ")}</span>
                  <span className={statusPillClass(wager.status)}>{formatStatus(wager.status)}</span>
                </div>
                <p className="mt-3 text-lg font-semibold">
                  {currencySymbol}{wager.stake.toFixed(2)} on {wager.outcome_label}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-on-subtle">{wager.event_title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-on-subtle">{wager.market_name}</p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="text-xs text-on-subtle">
                    Odds {wager.effective_odds.toFixed(2)} ·{" "}
                    {wager.status === "won" && wager.settled_payout
                      ? `Final Payout ${currencySymbol}${wager.settled_payout.toFixed(2)}`
                      : `Potential ${currencySymbol}${wager.estimated_payout.toFixed(2)}`}
                  </div>
                  <a href={`/market/${wager.market_id}`} className="prismatic-kicker text-primary-dim transition hover:text-white">
                    View
                  </a>
                </div>
                <p className="mt-2 text-xs text-on-subtle">{new Date(wager.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!wagers.length && !wagersQuery.isLoading ? (
              <p className="text-sm text-on-subtle">No wagers yet. Select a market to place your first bet.</p>
            ) : null}
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  );
};

const Metric = ({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) => (
  <div>
    <p className="text-[0.62rem] font-headline tracking-[0.16em] uppercase text-on-subtle">{label}</p>
    <p className={`mt-2 text-3xl font-bold ${muted ? "text-on-subtle" : "text-white"}`}>{value}</p>
  </div>
);

const MetaCard = ({
  icon,
  label,
  value,
  tone = "text-white"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: string;
}) => (
  <div className="bg-surface-low px-6 py-6">
    <div>{icon}</div>
    <p className="mt-4 text-[0.62rem] font-headline tracking-[0.16em] uppercase text-on-subtle">{label}</p>
    <p className={`mt-3 text-lg font-semibold ${tone}`}>{value}</p>
  </div>
);

const SummaryTile = ({ label, value }: { label: string; value: string }) => (
  <div className="prismatic-metric px-5 py-4">
    <p className="prismatic-kicker">{label}</p>
    <p className="mt-2 font-headline text-3xl font-extrabold text-white">{value}</p>
  </div>
);

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
    <div className="border border-white/10 bg-surface px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline text-lg font-extrabold uppercase tracking-[0.05em] text-white">{title}</h3>
        {isLoading ? <span className="prismatic-kicker">Loading</span> : null}
      </div>
      <div className="mt-4 space-y-3">
        {entries.map((entry) => (
          <article key={entry.id} className="border border-white/10 bg-surface-lowest px-4 py-3 text-sm text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-semibold">
                {currencySymbol}{entry.amount.toFixed(2)}
              </p>
              <span className={statusPillClass(entry.status)}>{formatStatus(entry.status)}</span>
            </div>
            <p className="mt-2 text-xs text-on-subtle">Requested {new Date(entry.requested_at).toLocaleString()}</p>
            {entry.resolved_at ? (
              <p className="mt-1 text-xs text-primary-dim">
                Cleared {new Date(entry.resolved_at).toLocaleString()}
                {entry.resolved_by ? ` · ${formatUserId(entry.resolved_by)}` : ""}
              </p>
            ) : null}
          </article>
        ))}
        {!entries.length && !isLoading ? (
          <p className="text-sm text-on-subtle">No {title.toLowerCase()} yet.</p>
        ) : null}
      </div>
    </div>
  );
};

const renderTransactionLabel = (kind: string, meta?: Record<string, unknown> | null) => {
  if (!meta) return formatStatus(kind);
  const typed = meta as {
    market_id?: unknown;
    reason?: unknown;
    note?: unknown;
  };

  if (typeof typed.reason === "string" && typed.reason.trim().length) return typed.reason;
  if (typeof typed.note === "string" && typed.note.trim().length) return typed.note;
  if (typeof typed.market_id === "string") return `Market settlement ${typed.market_id.slice(0, 8)}`;
  return formatStatus(kind);
};

const renderTransactionNote = (meta?: Record<string, unknown> | null) => {
  if (!meta) return null;
  const typed = meta as {
    market_id?: unknown;
    outcome_id?: unknown;
    reason?: unknown;
  };
  if (typeof typed.market_id === "string" && typeof typed.outcome_id === "string") {
    return <p className="text-xs uppercase tracking-[0.14em] text-on-subtle">Market #{typed.market_id.slice(0, 6)}…</p>;
  }
  if (typeof typed.reason === "string") {
    return <p className="text-xs uppercase tracking-[0.14em] text-on-subtle">{typed.reason}</p>;
  }
  return null;
};

const formatStatus = (status: string) => (status ? status.replace(/_/g, " ") : "pending");

const formatUserId = (id: string) => `${id.slice(0, 6)}…`;

const statusPillClass = (status: string) => {
  if (status === "won" || status.includes("approved") || status.includes("processed")) {
    return "inline-flex border border-primary-container/25 bg-primary-container/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-primary-dim";
  }
  if (status === "lost" || status.includes("rejected") || status.includes("failed")) {
    return "inline-flex border border-danger/25 bg-danger/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-danger";
  }
  return "inline-flex border border-white/10 bg-white/5 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle";
};

export default AccountPage;
