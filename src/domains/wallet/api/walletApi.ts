import { supabase } from "@lib/supabaseClient";

export const fetchWalletSummary = async (userId: string) => {
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

export interface WalletTransaction {
  id: string;
  amount: number;
  kind: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export const fetchWalletTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, amount, kind, meta, created_at, wallet_accounts!inner(user_id)")
    .eq("wallet_accounts.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (
    data?.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      kind: row.kind,
      meta: row.meta ?? {},
      created_at: row.created_at
    })) ?? []
  );
};

export const fetchAllWalletTransactions = async (limit = 50) => {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, amount, kind, meta, created_at, wallet_accounts!inner(user_id)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (
    data?.map((row) => {
      const accounts = row.wallet_accounts as
        | { user_id: string }
        | { user_id: string }[]
        | null
        | undefined;
      const account = Array.isArray(accounts) ? accounts[0] : accounts;
      return {
        id: row.id,
        amount: Number(row.amount),
        kind: row.kind,
        meta: row.meta ?? {},
        created_at: row.created_at,
        user_id: account?.user_id ?? "unknown"
      };
    }) ?? []
  );
};

export const requestDeposit = async (amount: number) => {
  const { data, error } = await supabase.rpc("wallet_request_deposit", {
    p_amount: amount
  });
  if (import.meta.env.DEV) {
    // Helpful in dev to trace deposit flow end-to-end
    // without affecting production behavior.
    // eslint-disable-next-line no-console
    console.log("wallet_request_deposit result", { amount, data, error });
  }
  if (error) throw error;
};

export const requestWithdrawal = async (amount: number) => {
  const { error } = await supabase.rpc("wallet_request_withdrawal", {
    p_amount: amount
  });
  if (error) throw error;
};

export interface PendingDeposit {
  id: string;
  amount: number;
  requested_at: string;
  account_id: string;
  user_id: string;
  username: string | null;
  ic_phone_number: string | null;
}

export const fetchPendingDeposits = async () => {
  const { data, error } = await supabase
    .from("deposits")
    .select(`
      id,
      amount,
      requested_at,
      account_id,
      wallet_accounts!inner(
        user_id,
        profiles(username, ic_phone_number)
      )
    `)
    .eq("status", "requested")
    .order("requested_at", { ascending: true });

  if (error) throw error;
  return (
    data?.map((row) => {
      const userId = extractUserId(row.wallet_accounts);
      const walletAccount = Array.isArray(row.wallet_accounts)
        ? row.wallet_accounts[0]
        : row.wallet_accounts;
      const profile = walletAccount?.profiles;
      const profileData = Array.isArray(profile) ? profile[0] : profile;

      return {
        id: row.id,
        amount: Number(row.amount),
        requested_at: row.requested_at,
        account_id: row.account_id,
        user_id: userId,
        username: profileData?.username || null,
        ic_phone_number: profileData?.ic_phone_number || null
      };
    }) ?? []
  );
};

export interface PendingWithdrawal {
  id: string;
  amount: number;
  requested_at: string;
  account_id: string;
  user_id: string;
  username: string | null;
  ic_phone_number: string | null;
}

export const fetchPendingWithdrawals = async () => {
  const { data, error } = await supabase
    .from("withdrawals")
    .select(`
      id,
      amount,
      requested_at,
      account_id,
      wallet_accounts!inner(
        user_id,
        profiles(username, ic_phone_number)
      )
    `)
    .eq("status", "requested")
    .order("requested_at", { ascending: true });

  if (error) throw error;
  return (
    data?.map((row) => {
      const userId = extractUserId(row.wallet_accounts);
      const walletAccount = Array.isArray(row.wallet_accounts)
        ? row.wallet_accounts[0]
        : row.wallet_accounts;
      const profile = walletAccount?.profiles;
      const profileData = Array.isArray(profile) ? profile[0] : profile;

      return {
        id: row.id,
        amount: Number(row.amount),
        requested_at: row.requested_at,
        account_id: row.account_id,
        user_id: userId,
        username: profileData?.username || null,
        ic_phone_number: profileData?.ic_phone_number || null
      };
    }) ?? []
  );
};

export const approveDeposit = async (depositId: string) => {
  const { error } = await supabase.rpc("wallet_approve_deposit", {
    p_deposit_id: depositId
  });
  if (error) throw error;
};

export const approveWithdrawal = async (withdrawalId: string) => {
  const { error } = await supabase.rpc("wallet_approve_withdrawal", {
    p_withdrawal_id: withdrawalId
  });
  if (error) throw error;
};

export const rejectWithdrawal = async (withdrawalId: string, reason?: string) => {
  const { error } = await supabase.rpc("wallet_reject_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_reason: reason ?? null
  });
  if (error) throw error;
};

export interface UserDepositRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export const fetchUserDeposits = async (userId: string, limit = 20) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("deposits")
    .select(
      "id, amount, status, requested_at, approved_at, approved_by, wallet_accounts!inner(user_id)"
    )
    .eq("wallet_accounts.user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (
    data?.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      status: row.status as string,
      requested_at: row.requested_at as string,
      approved_at: row.approved_at as string | null,
      approved_by: row.approved_by as string | null
    })) ?? []
  );
};

export interface UserWithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
  processed_by: string | null;
}

export const fetchUserWithdrawals = async (userId: string, limit = 20) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("withdrawals")
    .select(
      "id, amount, status, requested_at, processed_at, processed_by, admin_note, wallet_accounts!inner(user_id)"
    )
    .eq("wallet_accounts.user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (
    data?.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      status: row.status as string,
      requested_at: row.requested_at as string,
      processed_at: row.processed_at as string | null,
      admin_note: row.admin_note as string | null,
      processed_by: row.processed_by as string | null
    })) ?? []
  );
};

const extractUserId = (value: any): string => {
  if (!value) return "unknown";
  if (Array.isArray(value)) {
    return value[0]?.user_id ?? "unknown";
  }
  return value.user_id ?? "unknown";
};
