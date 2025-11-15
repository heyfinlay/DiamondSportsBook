export declare const fetchWalletSummary: (userId: string) => Promise<{
    balance: number;
}>;
export interface WalletTransaction {
    id: string;
    amount: number;
    kind: string;
    meta: Record<string, unknown>;
    created_at: string;
}
export declare const fetchWalletTransactions: (userId: string) => Promise<{
    id: any;
    amount: number;
    kind: any;
    meta: any;
    created_at: any;
}[]>;
export declare const fetchAllWalletTransactions: (limit?: number) => Promise<{
    id: any;
    amount: number;
    kind: any;
    meta: any;
    created_at: any;
    user_id: string;
}[]>;
export declare const requestDeposit: (amount: number) => Promise<void>;
export declare const requestWithdrawal: (amount: number) => Promise<void>;
export interface PendingDeposit {
    id: string;
    amount: number;
    requested_at: string;
    account_id: string;
    user_id: string;
}
export declare const fetchPendingDeposits: () => Promise<{
    id: any;
    amount: number;
    requested_at: any;
    account_id: any;
    user_id: string;
}[]>;
export interface PendingWithdrawal {
    id: string;
    amount: number;
    requested_at: string;
    account_id: string;
    user_id: string;
}
export declare const fetchPendingWithdrawals: () => Promise<{
    id: any;
    amount: number;
    requested_at: any;
    account_id: any;
    user_id: string;
}[]>;
export declare const approveDeposit: (depositId: string) => Promise<void>;
export declare const approveWithdrawal: (withdrawalId: string) => Promise<void>;
