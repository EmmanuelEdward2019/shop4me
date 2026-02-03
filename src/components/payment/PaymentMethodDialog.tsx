import { useState, useEffect } from "react";
import { Wallet, CreditCard, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  email: string;
  onSuccess?: () => void;
}

export const PaymentMethodDialog = ({
  open,
  onOpenChange,
  orderId,
  amount,
  email,
  onSuccess,
}: PaymentMethodDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card">("wallet");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchWalletBalance();
    }
  }, [user, open]);

  const fetchWalletBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setWalletBalance(data?.balance || 0);
      
      // Default to card if insufficient balance
      if ((data?.balance || 0) < amount) {
        setPaymentMethod("card");
      }
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

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("pay-with-wallet", {
        body: { orderId, amount },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Payment successful!");
        onOpenChange(false);
        onSuccess?.();
        // Navigate to refresh the order
        navigate(`/dashboard/orders/${orderId}`, { replace: true });
        window.location.reload();
      } else {
        throw new Error(data.error || "Payment failed");
      }
    } catch (error) {
      console.error("Wallet payment error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayWithCard = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          orderId,
          amount,
          email,
          callbackUrl: `${window.location.origin}/dashboard/orders/${orderId}`,
        },
      });

      if (error) throw error;

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      console.error("Card payment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to initialize payment");
      setIsProcessing(false);
    }
  };

  const handleProceed = () => {
    if (paymentMethod === "wallet") {
      handlePayWithWallet();
    } else {
      handlePayWithCard();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Choose Payment Method</DialogTitle>
          <DialogDescription>
            Select how you'd like to pay for your order
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
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
                    {canPayWithWallet && paymentMethod === "wallet" && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  {!canPayWithWallet && (
                    <p className="text-xs text-destructive mt-2">
                      Insufficient balance. Top up your wallet or pay with card.
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Pay with Card</p>
                        <p className="text-sm text-muted-foreground">
                          Debit/Credit card via Paystack
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "card" && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <Button
              className="w-full"
              size="lg"
              onClick={handleProceed}
              disabled={isProcessing || (paymentMethod === "wallet" && !canPayWithWallet)}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatCurrency(amount)}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
