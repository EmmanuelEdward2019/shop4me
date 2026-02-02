import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Zap } from "lucide-react";
import CardBrandIcon from "./CardBrandIcon";

interface PaymentCard {
  id: string;
  card_type: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string | null;
  brand: string | null;
  is_default: boolean;
  nickname: string | null;
}

interface ChargeCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PaymentCard | null;
  email: string;
  onSuccess?: (amount: number) => void;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const ChargeCardDialog = ({ open, onOpenChange, card, email, onSuccess }: ChargeCardDialogProps) => {
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

  const handleCharge = async () => {
    if (!card) return;
    
    const numericAmount = parseInt(amount, 10);
    
    if (!numericAmount || numericAmount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum amount is ₦100",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-charge-card", {
        body: {
          cardId: card.id,
          amount: numericAmount,
          email: email,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to charge card");
      }

      onOpenChange(false);
      setAmount("");
      onSuccess?.(numericAmount);
    } catch (error: any) {
      console.error("Card charge error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to charge card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Quick Top-up</DialogTitle>
          <DialogDescription>
            Instantly add funds using your saved card
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected card display */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
            <CardBrandIcon brand={card.brand} />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {card.nickname || `•••• ${card.last4}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {card.brand} •••• {card.last4} · Expires {card.exp_month}/{card.exp_year}
              </p>
            </div>
          </div>

          {/* Preset amounts */}
          <div className="space-y-2">
            <Label>Select amount</Label>
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
            <Label htmlFor="charge-amount">Or enter custom amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₦
              </span>
              <Input
                id="charge-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                className="pl-8 text-lg font-medium"
              />
            </div>
          </div>

          {/* Amount preview */}
          {amount && parseInt(amount) >= 100 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount to charge</span>
                <span className="text-xl font-display font-bold text-primary">
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
            onClick={handleCharge}
            disabled={loading || !amount || parseInt(amount) < 100}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Charging...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Charge Card
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChargeCardDialog;
