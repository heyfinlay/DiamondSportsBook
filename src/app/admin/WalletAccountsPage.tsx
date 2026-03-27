import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet2 } from "lucide-react";
import {
  adminAdjustWalletBalance,
  fetchAdminWalletAccounts,
  fetchAllWalletTransactions
} from "@domains/wallet/api/walletApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { walletKeys } from "@lib/query/keys";

const WalletAccountsPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [amount, setAmount] = useState("250");
  const [reason, setReason] = useState("manual_top_up");
  const [note, setNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const accountsQuery = useQuery({
    queryKey: walletKeys.adminAccounts(),
    queryFn: () => fetchAdminWalletAccounts(200)
  });

  const auditQuery = useQuery({
    queryKey: ["admin-wallet-audit"],
    queryFn: () => fetchAllWalletTransactions(20)
  });

  const adjustMutation = useMutation({
    mutationFn: adminAdjustWalletBalance,
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Wallet adjusted",
        description: "The balance change was written to the wallet ledger."
      });
      setAmount("250");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: walletKeys.adminAccounts() });
      void queryClient.invalidateQueries({ queryKey: ["admin-wallet-audit"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
      void queryClient.invalidateQueries({ queryKey: ["wallet-transactions"], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Balance adjustment failed",
        description: error.message
      });
    }
  });

  const accounts = accountsQuery.data ?? [];
  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return accounts;

    return accounts.filter((account) => {
      const haystack = [
        account.profile?.display_name,
        account.profile?.username,
        account.profile?.ic_number,
        account.user_id
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [accounts, searchQuery]);

  const selectedAccount =
    filteredAccounts.find((account) => account.user_id === selectedUserId) ??
    accounts.find((account) => account.user_id === selectedUserId) ??
    null;

  const totalBalances = accounts.reduce((sum, account) => sum + account.balance, 0);
  const fundedAccounts = accounts.filter((account) => account.balance > 0).length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!selectedUserId) {
      toast({
        variant: "error",
        title: "Choose an account",
        description: "Select a wallet account before submitting an adjustment."
      });
      return;
    }

    if (!numericAmount || Number.isNaN(numericAmount)) {
      toast({
        variant: "error",
        title: "Invalid amount",
        description: "Enter a positive or negative amount."
      });
      return;
    }

    adjustMutation.mutate({
      userId: selectedUserId,
      amount: numericAmount,
      reason,
      note
    });
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="prismatic-kicker text-primary-dim">Wallet Source Of Truth</p>
        <h1 className="mt-3 font-headline text-4xl font-black uppercase tracking-tight text-white">
          Wallet Control
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-on-subtle">
          Inspect every wallet on the platform, review current balances, and apply remote credit or
          debit adjustments directly into the ledger.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tracked Accounts" value={String(accounts.length)} />
        <MetricCard label="Funded Accounts" value={String(fundedAccounts)} />
        <MetricCard label="Total Balance" value={`${currencySymbol}${totalBalances.toFixed(0)}`} />
        <MetricCard label="Recent Ledger Entries" value={String((auditQuery.data ?? []).length)} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.85fr)]">
        <section className="prismatic-card p-6">
          <div className="relative z-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="prismatic-kicker text-white">Account Ledger</p>
                <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-white">
                  Wallet Accounts
                </h2>
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, username, IC, or user ID"
                className="min-h-[2.75rem] w-full max-w-sm border border-outline-variant/15 bg-surface-lowest px-4 text-sm text-white outline-none transition placeholder:text-on-subtle focus:border-primary-container/35"
              />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="prismatic-table min-w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left">Account</th>
                    <th className="px-6 py-4 text-left">Balance</th>
                    <th className="px-6 py-4 text-left">Transactions</th>
                    <th className="px-6 py-4 text-left">Last Activity</th>
                    <th className="px-6 py-4 text-right">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => {
                    const label =
                      account.profile?.display_name ||
                      account.profile?.username ||
                      `User ${account.user_id.slice(0, 8)}…`;

                    return (
                      <tr key={account.account_id}>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-white">{label}</p>
                            <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                              @{account.profile?.username ?? "no-username"} • IC {account.profile?.ic_number ?? "—"}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-white">
                          {currencySymbol}
                          {account.balance.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-sm text-on-subtle">
                          {account.transaction_count}
                        </td>
                        <td className="px-6 py-5 text-sm text-on-subtle">
                          {account.last_transaction_at
                            ? new Date(account.last_transaction_at).toLocaleString()
                            : "No activity"}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            className="prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]"
                            onClick={() => setSelectedUserId(account.user_id)}
                          >
                            {selectedUserId === account.user_id ? "Selected" : "Manage"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!accountsQuery.isLoading && filteredAccounts.length === 0 ? (
                <p className="px-6 py-8 text-sm text-on-subtle">
                  No wallet accounts matched this search.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="prismatic-card p-6">
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <Wallet2 className="h-5 w-5 text-primary-container" />
                <div>
                  <p className="prismatic-kicker text-primary-dim">Manual Adjustment</p>
                  <h2 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight text-white">
                    Balance Control
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="border border-outline-variant/15 bg-surface-lowest/80 px-4 py-4">
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                    Selected Account
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {selectedAccount
                      ? selectedAccount.profile?.display_name ||
                        selectedAccount.profile?.username ||
                        selectedAccount.user_id
                      : "Choose an account from the ledger"}
                  </p>
                  {selectedAccount ? (
                    <p className="mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                      Current balance {currencySymbol}
                      {selectedAccount.balance.toFixed(2)}
                    </p>
                  ) : null}
                </div>

                <label className="block space-y-2 text-sm">
                  <span className="text-on-subtle">Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="min-h-[2.75rem] w-full border border-outline-variant/15 bg-surface-lowest px-4 text-white outline-none transition focus:border-primary-container/35"
                  />
                  <span className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                    Use a positive amount to credit, or a negative amount to debit.
                  </span>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="text-on-subtle">Reason</span>
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-h-[2.75rem] w-full border border-outline-variant/15 bg-surface-lowest px-4 text-white outline-none transition focus:border-primary-container/35"
                  >
                    <option value="manual_top_up">Manual top up</option>
                    <option value="manual_correction">Manual correction</option>
                    <option value="fraud_reversal">Fraud reversal</option>
                    <option value="promotional_credit">Promotional credit</option>
                  </select>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="text-on-subtle">Note</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    className="w-full border border-outline-variant/15 bg-surface-lowest px-4 py-3 text-white outline-none transition focus:border-primary-container/35"
                    placeholder="Operator note for the ledger"
                  />
                </label>

                <button
                  type="submit"
                  className="prismatic-button prismatic-button-primary min-h-[2.4rem] w-full px-4 text-[0.62rem]"
                  disabled={adjustMutation.isPending}
                >
                  Apply Wallet Adjustment
                </button>
              </form>
            </div>
          </section>

          <section className="prismatic-card p-6">
            <div className="relative z-10">
              <p className="prismatic-kicker text-white">Recent Ledger</p>
              <div className="mt-5 space-y-3">
                {(auditQuery.data ?? []).slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    className="border-l-2 border-primary-container/35 bg-surface-lowest/80 px-4 py-3"
                  >
                    <p className="text-[0.58rem] uppercase tracking-[0.18em] text-primary-container">
                      {tx.kind}
                    </p>
                    <p className="mt-2 text-sm text-on-surface">
                      {tx.user_id.slice(0, 8)}… • {tx.amount >= 0 ? "+" : ""}
                      {currencySymbol}
                      {Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="border-l-2 border-primary-container bg-surface-low/85 px-5 py-5">
    <p className="text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle">{label}</p>
    <p className="mt-3 font-headline text-4xl font-black text-white">{value}</p>
  </div>
);

export default WalletAccountsPage;
