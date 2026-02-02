import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BankingSectionProps {
  loading: boolean;
  saving: boolean;
  formData: {
    bank_name: string;
    account_name: string;
    account_number: string;
  };
  onFormChange: (field: string, value: string) => void;
  onSave: () => void;
}

const BankingSection = ({
  loading,
  saving,
  formData,
  onFormChange,
  onSave,
}: BankingSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Banking Information
        </CardTitle>
        <CardDescription>
          Update your bank details for receiving payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => onFormChange("bank_name", e.target.value)}
                placeholder="e.g., First Bank, GTBank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => onFormChange("account_name", e.target.value)}
                placeholder="Account holder name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => onFormChange("account_number", e.target.value)}
                placeholder="10-digit account number"
                maxLength={10}
              />
            </div>

            <Button onClick={onSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Banking Info"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BankingSection;
