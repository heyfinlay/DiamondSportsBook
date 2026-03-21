import { useWalletBalance } from "@domains/wallet/hooks/useWalletBalance";
import { useWalletRealtime } from "@domains/wallet/hooks/useWalletRealtime";
import { useWalletStore } from "@domains/wallet/store/walletStore";
import { useSession } from "@lib/auth/SessionProvider";
import { Link } from "react-router-dom";
import { currencySymbol } from "@lib/currency";
import { Wallet2 } from "lucide-react";

const WalletSummary = () => {
  const { user, loading } = useSession();
  const { data, isLoading } = useWalletBalance(user?.id);
  useWalletRealtime(user?.id ?? undefined);
  const cachedBalance = useWalletStore((state) => state.balance);

  if (!user && !loading) {
    return (
      <div className="flex items-center justify-between border border-white/10 bg-surface px-4 py-2.5 text-right text-sm text-on-subtle">
        <span className="prismatic-kicker text-[0.62rem]">Guest Mode</span>
        <Link to="/login" className="prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.62rem]">
          Sign In
        </Link>
      </div>
    );
  }

  const balance = data?.balance ?? cachedBalance ?? 0;
  const pending = loading || isLoading;

  return (
    <div className="flex w-full items-center justify-between gap-3 border border-white/10 bg-surface px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3 text-left">
        <div className="inline-flex h-10 w-10 items-center justify-center bg-surface-high text-primary-container">
          <Wallet2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="prismatic-kicker text-[0.58rem]">Vault Balance</p>
          <p className="truncate font-headline text-lg font-extrabold tracking-[0.05em] text-white">
            {pending
              ? "…"
              : `${currencySymbol}${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>
      <Link
        to="/account"
        className="prismatic-button prismatic-button-secondary min-h-[2.4rem] shrink-0 px-3 text-[0.62rem]"
      >
        Vault
      </Link>
    </div>
  );
};

export default WalletSummary;
