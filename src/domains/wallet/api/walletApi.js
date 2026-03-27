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
export const fetchAdminWalletAccounts = async (limit = 100) => {
    const { data, error } = await supabase
        .from("wallet_admin_accounts")
        .select("account_id, user_id, balance, transaction_count, created_at, last_transaction_at")
        .order("balance", { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    const userIds = (data ?? [])
        .map((row) => row.user_id)
        .filter((value) => Boolean(value));
    let profilesById = {};
    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, username, ic_number")
            .in("id", userIds);
        if (profilesError)
            throw profilesError;
        profilesById = Object.fromEntries((profiles ?? []).map((profile) => [
            profile.id,
            {
                id: profile.id ?? null,
                display_name: profile.display_name ?? null,
                username: profile.username ?? null,
                ic_number: profile.ic_number ?? null
            }
        ]));
    }
    return (data?.map((row) => ({
        account_id: row.account_id,
        user_id: row.user_id,
        balance: Number(row.balance ?? 0),
        transaction_count: Number(row.transaction_count ?? 0),
        created_at: row.created_at,
        last_transaction_at: row.last_transaction_at ?? null,
        profile: profilesById[row.user_id] ?? null
    })) ?? []);
};
export const adminAdjustWalletBalance = async (input) => {
    const { data, error } = await supabase.rpc("wallet_admin_adjust_balance", {
        p_user_id: input.userId,
        p_amount: input.amount,
        p_reason: input.reason,
        p_note: input.note ?? null
    });
    if (error)
        throw error;
    return data;
};
export const requestDeposit = async (amount) => {
    const { data, error } = await supabase.rpc("wallet_request_deposit", {
        p_amount: amount
    });
    if (import.meta.env.DEV) {
        // Helpful in dev to trace deposit flow end-to-end
        // without affecting production behavior.
        // eslint-disable-next-line no-console
        console.log("wallet_request_deposit result", { amount, data, error });
    }
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
        .select(`
      id,
      amount,
      requested_at,
      account_id,
      wallet_accounts!inner(user_id)
    `)
        .eq("status", "requested")
        .order("requested_at", { ascending: true });
    if (error)
        throw error;
    const rows = data?.map((row) => {
        const account = Array.isArray(row.wallet_accounts) ? row.wallet_accounts[0] : row.wallet_accounts;
        return {
            id: row.id,
            amount: Number(row.amount),
            requested_at: row.requested_at,
            account_id: row.account_id,
            user_id: account?.user_id ?? null
        };
    }) ?? [];
    // No direct FK from deposits to profiles; fetch profiles separately by user_id for admin display.
    const userIds = rows.map((r) => r.user_id).filter((id) => Boolean(id));
    let profilesById = {};
    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, username, ic_number")
            .in("id", userIds);
        if (profilesError)
            throw profilesError;
        profilesById = Object.fromEntries((profiles ?? []).map((p) => [
            p.id,
            {
                id: p.id ?? null,
                display_name: p.display_name ?? null,
                username: p.username ?? null,
                ic_number: p.ic_number ?? null
            }
        ]));
    }
    return rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        requested_at: row.requested_at,
        account_id: row.account_id,
        user_id: row.user_id ?? "unknown",
        profile: profilesById[row.user_id ?? ""] ?? null
    }));
};
export const fetchPendingWithdrawals = async () => {
    const { data, error } = await supabase
        .from("withdrawals")
        .select(`
      id,
      amount,
      requested_at,
      account_id,
      wallet_accounts!inner(user_id)
    `)
        .eq("status", "requested")
        .order("requested_at", { ascending: true });
    if (error)
        throw error;
    const rows = data?.map((row) => {
        const account = Array.isArray(row.wallet_accounts) ? row.wallet_accounts[0] : row.wallet_accounts;
        return {
            id: row.id,
            amount: Number(row.amount),
            requested_at: row.requested_at,
            account_id: row.account_id,
            user_id: account?.user_id ?? null
        };
    }) ?? [];
    const userIds = rows.map((r) => r.user_id).filter((id) => Boolean(id));
    let profilesById = {};
    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, username, ic_number")
            .in("id", userIds);
        if (profilesError)
            throw profilesError;
        profilesById = Object.fromEntries((profiles ?? []).map((p) => [
            p.id,
            {
                id: p.id ?? null,
                display_name: p.display_name ?? null,
                username: p.username ?? null,
                ic_number: p.ic_number ?? null
            }
        ]));
    }
    return rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        requested_at: row.requested_at,
        account_id: row.account_id,
        user_id: row.user_id ?? "unknown",
        profile: profilesById[row.user_id ?? ""] ?? null
    }));
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
