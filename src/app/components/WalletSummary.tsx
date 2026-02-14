import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useSession } from "@lib/auth/SessionProvider";
import { Link } from "react-router-dom";
import { currencySymbol } from "@lib/currency";

const WalletSummary = () => {
  const { user, loading } = useSession();
  const { data, isLoading } = useWalletBalance(user?.id);
  useWalletRealtime(user?.id ?? undefined);
  const cachedBalance = useWalletStore((state) => state.balance);

  if (!user && !loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right text-sm text-white/70">
        Guest Mode
      </div>
    );
  }

  const balance = data?.balance ?? cachedBalance ?? 0;
  const pending = loading || isLoading;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
      <div className="text-left">
        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Wallet</p>
        <p className="text-lg font-semibold text-white">
          {pending
            ? "…"
            : `${currencySymbol}${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        </p>
      </div>
      <Link
        to="/account"
        className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-gold/60 hover:text-white"
      >
        Manage
      </Link>
    </div>
  );
};

export default WalletSummary;
