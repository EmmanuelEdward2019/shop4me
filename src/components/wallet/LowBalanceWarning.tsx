import { AlertTriangle, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface LowBalanceWarningProps {
  balance: number;
  threshold?: number;
  onTopUp: () => void;
}

const LowBalanceWarning = ({ 
  balance, 
  threshold = 500, 
  onTopUp 
}: LowBalanceWarningProps) => {
  if (balance >= threshold) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span>
          Your wallet balance is low ({formatCurrency(balance)}). Top up to continue placing orders.
        </span>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={onTopUp}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          Top Up Now
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default LowBalanceWarning;
