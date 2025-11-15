import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useSession } from "@lib/auth/SessionProvider";

const WalletSummary = () => {
  const { user, loading } = useSession();
  const { data, isLoading } = useWalletBalance(user?.id);

  if (!user && !loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right text-sm text-white/70">
        Guest Mode
      </div>
    );
  }

  const balance = data?.balance ?? 0;
  const pending = loading || isLoading;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right">
      <p className="text-xs uppercase tracking-widest text-white/60">Balance</p>
      <p className="text-lg font-semibold">
        {pending ? "…" : `Ɖ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
      </p>
    </div>
  );
};

export default WalletSummary;
