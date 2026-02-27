import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Wallet, WalletTransaction } from "@shared/types";

interface UseWalletOptions {
  client: SupabaseClient;
  userId: string | undefined;
  /** Subscribe to realtime balance + transaction changes */
  realtime?: boolean;
  /** Max transactions to fetch (default 100) */
  limit?: number;
}

interface UseWalletReturn {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fundWallet: (email: string, amountKobo: number, callbackUrl?: string) => Promise<{ url: string; reference: string } | null>;
  payWithWallet: (orderId: string, amount: number) => Promise<boolean>;
  verifyPayment: (reference: string) => Promise<{ success: boolean; amount?: number }>;
}

export const useWallet = ({
  client,
  userId,
  realtime = true,
  limit = 100,
}: UseWalletOptions): UseWalletReturn => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!userId) {
      setWallet(null);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: walletData, error: walletError } = await client
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) throw walletError;
      setWallet(walletData as Wallet | null);

      if (walletData) {
        const { data: txData, error: txError } = await client
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (txError) throw txError;
        setTransactions((txData as WalletTransaction[]) || []);
      }
    } catch (err: any) {
      console.error("useWallet: fetch error", err);
      setError(err.message || "Failed to fetch wallet");
    } finally {
      setLoading(false);
    }
  }, [client, userId, limit]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Realtime subscription
  useEffect(() => {
    if (!wallet?.id || !realtime) return;

    const channel = client
      .channel(`wallet-${wallet.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `id=eq.${wallet.id}` },
        (payload) => {
          setWallet((prev) =>
            prev ? { ...prev, balance: payload.new.balance } : prev
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `wallet_id=eq.${wallet.id}` },
        (payload) => {
          setTransactions((prev) => [payload.new as WalletTransaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, wallet?.id, realtime]);

  // ── Actions ──────────────────────────────────────────────────

  const fundWallet = async (
    email: string,
    amountKobo: number,
    callbackUrl?: string
  ): Promise<{ url: string; reference: string } | null> => {
    try {
      const { data, error } = await client.functions.invoke("paystack-wallet-topup", {
        body: { email, amount: amountKobo, callbackUrl },
      });
      if (error) throw new Error(error.message);
      return {
        url: data.authorization_url,
        reference: data.reference,
      };
    } catch (err: any) {
      console.error("useWallet: fundWallet error", err);
      setError(err.message);
      return null;
    }
  };

  const payWithWallet = async (orderId: string, amount: number): Promise<boolean> => {
    try {
      const { data, error } = await client.functions.invoke("pay-with-wallet", {
        body: { orderId, amount },
      });
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Payment failed");
      return true;
    } catch (err: any) {
      console.error("useWallet: payWithWallet error", err);
      setError(err.message);
      return false;
    }
  };

  const verifyPayment = async (
    reference: string
  ): Promise<{ success: boolean; amount?: number }> => {
    try {
      const { data, error } = await client.functions.invoke("paystack-verify", {
        body: { reference },
      });
      if (error) throw new Error(error.message);
      return {
        success: data.status === "success",
        amount: data.transaction?.amount,
      };
    } catch (err: any) {
      console.error("useWallet: verifyPayment error", err);
      return { success: false };
    }
  };

  return {
    wallet,
    transactions,
    loading,
    error,
    refetch: fetchWallet,
    fundWallet,
    payWithWallet,
    verifyPayment,
  };
};
