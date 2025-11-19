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
    display_name: string | null;
    username: string | null;
    ic_phone_number: string | null;
}
export declare const fetchPendingDeposits: () => Promise<{
    id: any;
    amount: number;
    requested_at: any;
    account_id: any;
    user_id: string;
    display_name: any;
    username: any;
    ic_phone_number: any;
}[]>;
export interface PendingWithdrawal {
    id: string;
    amount: number;
    requested_at: string;
    account_id: string;
    user_id: string;
    display_name: string | null;
    username: string | null;
    ic_phone_number: string | null;
}
export declare const fetchPendingWithdrawals: () => Promise<{
    id: any;
    amount: number;
    requested_at: any;
    account_id: any;
    user_id: string;
    display_name: any;
    username: any;
    ic_phone_number: any;
}[]>;
export declare const approveDeposit: (depositId: string) => Promise<void>;
export declare const approveWithdrawal: (withdrawalId: string) => Promise<void>;
export declare const rejectWithdrawal: (withdrawalId: string, reason?: string) => Promise<void>;
export interface UserDepositRequest {
    id: string;
    amount: number;
    status: string;
    requested_at: string;
    approved_at: string | null;
    approved_by: string | null;
}
export declare const fetchUserDeposits: (userId: string, limit?: number) => Promise<{
    id: any;
    amount: number;
    status: string;
    requested_at: string;
    approved_at: string | null;
    approved_by: string | null;
}[]>;
export interface UserWithdrawalRequest {
    id: string;
    amount: number;
    status: string;
    requested_at: string;
    processed_at: string | null;
    admin_note: string | null;
    processed_by: string | null;
}
export declare const fetchUserWithdrawals: (userId: string, limit?: number) => Promise<{
    id: any;
    amount: number;
    status: string;
    requested_at: string;
    processed_at: string | null;
    admin_note: string | null;
    processed_by: string | null;
}[]>;
