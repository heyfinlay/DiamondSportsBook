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
export declare const useWalletStore: import("zustand").UseBoundStore<Omit<Omit<import("zustand").StoreApi<WalletState>, "setState"> & {
    setState<A extends string | {
        type: string;
    }>(partial: WalletState | Partial<WalletState> | ((state: WalletState) => WalletState | Partial<WalletState>), replace?: boolean, action?: A): void;
}, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: WalletState, previousSelectedState: WalletState) => void): () => void;
        <U>(selector: (state: WalletState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }): () => void;
    };
}>;
export {};
