import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, Clock, History, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import FundWalletDialog from "@/components/wallet/FundWalletDialog";

interface WalletData {
  id: string;
  balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  reference: string | null;
  created_at: string;
}

const WalletPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Check for payment verification on return from Paystack
  useEffect(() => {
    const verifyParam = searchParams.get("verify");
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    
    if (verifyParam && reference) {
      verifyPayment(reference);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });

      if (error) throw new Error(error.message);

      if (data.status === "success") {
        toast({
          title: "Payment Successful! 🎉",
          description: `₦${data.transaction.amount.toLocaleString()} has been added to your wallet`,
        });
        fetchWalletData(); // Refresh wallet data
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be verified. Please try again.",
          variant: "destructive",
        });
      }

      // Clear the URL params
      setSearchParams({});
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
      setSearchParams({});
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (walletError) throw walletError;
      setWallet(walletData);

      if (walletData) {
        const { data: txData, error: txError } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (txError) throw txError;
        setTransactions(txData || []);
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Wallet
          </h1>
          <p className="text-muted-foreground">
            Manage your wallet balance and transactions
          </p>
        </div>

        {/* Balance Card */}
        <Card className="bg-hero-gradient text-primary-foreground">
          <CardContent className="p-6">
            {loading || verifying ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-primary-foreground/20" />
                <Skeleton className="h-10 w-40 bg-primary-foreground/20" />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-primary-foreground/80 mb-1">Available Balance</p>
                  <p className="text-3xl md:text-4xl font-display font-bold">
                    {formatCurrency(wallet?.balance || 0)}
                  </p>
                </div>
                <Button 
                  variant="hero-outline" 
                  size="lg"
                  onClick={() => setFundDialogOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Funds
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-soft transition-shadow"
            onClick={() => setFundDialogOpen(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Fund Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Add money via card or transfer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-soft transition-shadow"
            onClick={() => {
              const historySection = document.getElementById('transaction-history');
              historySection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <History className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Payment History</p>
                  <p className="text-sm text-muted-foreground">
                    View all transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card id="transaction-history">
          <CardHeader>
            <CardTitle className="font-display">Transaction History</CardTitle>
            <CardDescription>Your recent wallet activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Your transaction history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === "credit"
                            ? "bg-primary/10"
                            : "bg-destructive/10"
                        }`}
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft className="w-5 h-5 text-primary" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {tx.description || (tx.type === "credit" ? "Deposit" : "Payment")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-medium ${
                        tx.type === "credit" ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "-"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fund Wallet Dialog */}
        <FundWalletDialog
          open={fundDialogOpen}
          onOpenChange={setFundDialogOpen}
          email={user?.email || ""}
          onSuccess={fetchWalletData}
        />
      </div>
    </DashboardLayout>
  );
};

export default WalletPage;
