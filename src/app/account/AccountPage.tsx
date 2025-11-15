import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useSession } from "@lib/auth/SessionProvider";

const AccountPage = () => {
  const transactions = useWalletStore((state) => state.transactions);
  const { user, loading } = useSession();

  if (!user && !loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in to manage your wallet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">
          Wallet
        </p>
        <h1 className="text-3xl font-semibold">Account</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <button className="rounded-3xl border border-white/10 bg-brand/10 px-6 py-5 text-left text-white">
          <h3 className="text-xl font-semibold">Deposit</h3>
          <p className="text-sm text-white/70">Request admin-approved credit</p>
        </button>
        <button className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-left text-white">
          <h3 className="text-xl font-semibold">Withdraw</h3>
          <p className="text-sm text-white/70">Submit withdrawal for review</p>
        </button>
      </div>
      <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        <div className="mt-4 space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold capitalize">{tx.kind}</p>
                <p className="text-xs text-white/60">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-lg font-semibold">
                {tx.amount > 0 ? "+" : ""}
                Ɖ{tx.amount.toFixed(2)}
              </p>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-sm text-white/60">
              No transactions yet — they will appear here in realtime once the
              wallet domain is wired up.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default AccountPage;
