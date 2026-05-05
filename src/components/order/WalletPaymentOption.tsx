import { useState, useEffect } from "react";
import { Wallet, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface WalletPaymentOptionProps {
  orderId: string;
  amount: number;
  onPaymentSuccess: () => void;
  onPayWithCard: () => void;
  isProcessingCard?: boolean;
}

export const WalletPaymentOption = ({
  orderId,
  amount,
  onPaymentSuccess,
  onPayWithCard,
  isProcessingCard = false,
}: WalletPaymentOptionProps) => {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card">("wallet");
  const [isProcessingWallet, setIsProcessingWallet] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
    }
  }, [user]);

  const fetchWalletBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setWalletBalance(data?.balance || 0);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(value);
  };

  const canPayWithWallet = walletBalance >= amount;

  const handlePayWithWallet = async () => {
    if (!canPayWithWallet) {
      toast.error("Insufficient wallet balance");
      return;
    }

    setIsProcessingWallet(true);
    try {
      const { data, error } = await supabase.functions.invoke("pay-with-wallet", {
        body: { orderId, amount },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Payment successful!");
        onPaymentSuccess();
      } else {
        throw new Error(data.error || "Payment failed");
      }
    } catch (error) {
      console.error("Wallet payment error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsProcessingWallet(false);
    }
  };

  const handleProceed = () => {
    if (paymentMethod === "wallet") {
      handlePayWithWallet();
    } else {
      onPayWithCard();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Amount to pay</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(amount)}</p>
        </div>

        <RadioGroup
          value={paymentMethod}
          onValueChange={(v) => setPaymentMethod(v as "wallet" | "card")}
          className="space-y-3"
        >
          <div
            className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              paymentMethod === "wallet"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            } ${!canPayWithWallet ? "opacity-60" : ""}`}
            onClick={() => canPayWithWallet && setPaymentMethod("wallet")}
          >
            <RadioGroupItem value="wallet" id="wallet" disabled={!canPayWithWallet} />
            <Label htmlFor="wallet" className="flex-1 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Pay with Wallet</p>
                    <p className="text-sm text-muted-foreground">
                      Balance: {formatCurrency(walletBalance)}
                    </p>
                  </div>
                </div>
                {canPayWithWallet && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </div>
              {!canPayWithWallet && (
                <p className="text-xs text-destructive mt-2">
                  Insufficient balance. Please top up or use card.
                </p>
              )}
            </Label>
          </div>

          <div
            className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              paymentMethod === "card"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            }`}
            onClick={() => setPaymentMethod("card")}
          >
            <RadioGroupItem value="card" id="card" />
            <Label htmlFor="card" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Pay with Card or Transfer</p>
                  <p className="text-sm text-muted-foreground">
                    Debit/Credit card or bank transfer via Paystack
                  </p>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <Button
          className="w-full"
          size="lg"
          onClick={handleProceed}
          disabled={isProcessingWallet || isProcessingCard || (paymentMethod === "wallet" && !canPayWithWallet)}
        >
          {isProcessingWallet || isProcessingCard ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatCurrency(amount)}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
