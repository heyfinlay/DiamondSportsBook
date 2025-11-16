import { supabase } from "@lib/supabaseClient";
export const fetchWalletSummary = async (userId) => {
    const { data, error } = await supabase
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", userId)
        .single();
    if (error) {
        if (error.code === "PGRST116") {
            return { balance: 0 };
        }
        throw error;
    }
    return { balance: Number(data.balance ?? 0) };
};
export const fetchWalletTransactions = async (userId) => {
    const { data, error } = await supabase
        .from("wallet_transactions")
        .select("id, amount, kind, meta, created_at, wallet_accounts!inner(user_id)")
        .eq("wallet_accounts.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        kind: row.kind,
        meta: row.meta ?? {},
        created_at: row.created_at
    })) ?? []);
};
export const fetchAllWalletTransactions = async (limit = 50) => {
    const { data, error } = await supabase
        .from("wallet_transactions")
        .select("id, amount, kind, meta, created_at, wallet_accounts!inner(user_id)")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return (data?.map((row) => {
        const accounts = row.wallet_accounts;
        const account = Array.isArray(accounts) ? accounts[0] : accounts;
        return {
            id: row.id,
            amount: Number(row.amount),
            kind: row.kind,
            meta: row.meta ?? {},
            created_at: row.created_at,
            user_id: account?.user_id ?? "unknown"
        };
    }) ?? []);
};
export const requestDeposit = async (amount) => {
    const { error } = await supabase.rpc("wallet_request_deposit", {
        p_amount: amount
    });
    if (error)
        throw error;
};
export const requestWithdrawal = async (amount) => {
    const { error } = await supabase.rpc("wallet_request_withdrawal", {
        p_amount: amount
    });
    if (error)
        throw error;
};
export const fetchPendingDeposits = async () => {
    const { data, error } = await supabase
        .from("deposits")
        .select("id, amount, requested_at, account_id, wallet_accounts!inner(user_id)")
        .eq("status", "requested")
        .order("requested_at", { ascending: true });
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        requested_at: row.requested_at,
        account_id: row.account_id,
        user_id: extractUserId(row.wallet_accounts)
    })) ?? []);
};
export const fetchPendingWithdrawals = async () => {
    const { data, error } = await supabase
        .from("withdrawals")
        .select("id, amount, requested_at, account_id, wallet_accounts!inner(user_id)")
        .eq("status", "requested")
        .order("requested_at", { ascending: true });
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        requested_at: row.requested_at,
        account_id: row.account_id,
        user_id: extractUserId(row.wallet_accounts)
    })) ?? []);
};
export const approveDeposit = async (depositId) => {
    const { error } = await supabase.rpc("wallet_approve_deposit", {
        p_deposit_id: depositId
    });
    if (error)
        throw error;
};
export const approveWithdrawal = async (withdrawalId) => {
    const { error } = await supabase.rpc("wallet_approve_withdrawal", {
        p_withdrawal_id: withdrawalId
    });
    if (error)
        throw error;
};
export const rejectWithdrawal = async (withdrawalId, reason) => {
    const { error } = await supabase.rpc("wallet_reject_withdrawal", {
        p_withdrawal_id: withdrawalId,
        p_reason: reason ?? null
    });
    if (error)
        throw error;
};
export const fetchUserDeposits = async (userId, limit = 20) => {
    if (!userId)
        return [];
    const { data, error } = await supabase
        .from("deposits")
        .select("id, amount, status, requested_at, approved_at, approved_by, wallet_accounts!inner(user_id)")
        .eq("wallet_accounts.user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        status: row.status,
        requested_at: row.requested_at,
        approved_at: row.approved_at,
        approved_by: row.approved_by
    })) ?? []);
};
export const fetchUserWithdrawals = async (userId, limit = 20) => {
    if (!userId)
        return [];
    const { data, error } = await supabase
        .from("withdrawals")
        .select("id, amount, status, requested_at, processed_at, processed_by, admin_note, wallet_accounts!inner(user_id)")
        .eq("wallet_accounts.user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        status: row.status,
        requested_at: row.requested_at,
        processed_at: row.processed_at,
        admin_note: row.admin_note,
        processed_by: row.processed_by
    })) ?? []);
};
const extractUserId = (value) => {
    if (!value)
        return "unknown";
    if (Array.isArray(value)) {
        return value[0]?.user_id ?? "unknown";
    }
    return value.user_id ?? "unknown";
};
