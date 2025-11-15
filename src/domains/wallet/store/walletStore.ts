import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

interface WalletState {
  balance: number;
  pending: boolean;
  transactions: Array<{
    id: string;
    amount: number;
    kind: string;
    createdAt: string;
  }>;
  setBalance: (value: number) => void;
  setPending: (value: boolean) => void;
  setTransactions: (tx: WalletState["transactions"]) => void;
}

export const useWalletStore = create<WalletState>()(
  devtools(
    subscribeWithSelector((set) => ({
      balance: 0,
      pending: false,
      transactions: [],
      setBalance: (value) => set({ balance: value }),
      setPending: (value) => set({ pending: value }),
      setTransactions: (transactions) => set({ transactions })
    })),
    { name: "wallet-store" }
  )
);
