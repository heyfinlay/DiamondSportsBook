import { useWalletStore } from "@domains/wallet/store/walletStore";

const WalletSummary = () => {
  const balance = useWalletStore((state) => state.balance);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right">
      <p className="text-xs uppercase tracking-widest text-white/60">Balance</p>
      <p className="text-lg font-semibold">
        Ɖ{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

export default WalletSummary;
