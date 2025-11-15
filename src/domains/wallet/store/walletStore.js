import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
export const useWalletStore = create()(devtools(subscribeWithSelector((set) => ({
    balance: 0,
    pending: false,
    transactions: [],
    setBalance: (value) => set({ balance: value }),
    setPending: (value) => set({ pending: value }),
    setTransactions: (transactions) => set({ transactions })
})), { name: "wallet-store" }));
