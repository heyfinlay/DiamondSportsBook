import { supabase } from "@lib/supabaseClient";

export const fetchWalletSummary = async (userId: string) => {
  const { data, error } = await supabase
    .from("wallet_balances")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If no wallet yet, treat as zero balance.
    if (error.code === "PGRST116") {
      return { balance: 0 };
    }
    throw error;
  }

  return { balance: Number(data.balance ?? 0) };
};
