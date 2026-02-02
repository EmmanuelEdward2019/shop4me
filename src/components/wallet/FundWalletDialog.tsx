import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";

interface FundWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const FundWalletDialog = ({ open, onOpenChange, email, onSuccess }: FundWalletDialogProps) => {
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setAmount(value);
  };

  const handleSubmit = async () => {
    const numericAmount = parseInt(amount, 10);
    
    if (!numericAmount || numericAmount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum funding amount is ₦100",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-wallet-topup", {
        body: {
          amount: numericAmount,
          email: email,
          callbackUrl: `${window.location.origin}/dashboard/wallet?verify=true`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to initialize payment");
      }

      // Redirect to Paystack
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error: any) {
      console.error("Fund wallet error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Fund Your Wallet</DialogTitle>
          <DialogDescription>
            Add money to your wallet to make purchases faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset amounts */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="text-sm"
                >
                  {formatCurrency(preset)}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Or enter custom amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₦
              </span>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                className="pl-8 text-lg font-medium"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum: ₦100</p>
          </div>

          {/* Amount preview */}
          {amount && parseInt(amount) >= 100 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount to add</span>
                <span className="text-xl font-display font-bold text-foreground">
                  {formatCurrency(parseInt(amount))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !amount || parseInt(amount) < 100}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay with Paystack
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FundWalletDialog;
