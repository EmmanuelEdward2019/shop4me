import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@shared/hooks";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, ArrowDownLeft, Clock, History, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import FundWalletDialog from "@/components/wallet/FundWalletDialog";
import SavedCardsSection from "@/components/wallet/SavedCardsSection";
import WalletFundedAnimation from "@/components/wallet/WalletFundedAnimation";
import TransactionFiltersComponent, { TransactionFilters, TransactionType } from "@/components/wallet/TransactionFilters";
import TransactionExport from "@/components/wallet/TransactionExport";
import LowBalanceWarning from "@/components/wallet/LowBalanceWarning";
import MonthlySpendingSummary from "@/components/wallet/MonthlySpendingSummary";
import AnimatedBalance from "@/components/wallet/AnimatedBalance";
import { startOfDay, endOfDay } from "date-fns";

const WalletPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    wallet,
    transactions,
    loading,
    refetch: fetchWalletData,
    verifyPayment: verifyPaymentFn,
  } = useWallet({
    client: supabase,
    userId: user?.id,
  });
  const [filteredTransactions, setFilteredTransactions] = useState<typeof transactions>([]);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [fundedAmount, setFundedAmount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: "all",
    dateRange: undefined,
  });

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
      const result = await verifyPaymentFn(reference);

      if (result.success) {
        setFundedAmount(result.amount || 0);
        setShowSuccessAnimation(true);
        fetchWalletData();
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be verified. Please try again.",
          variant: "destructive",
        });
      }

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

  // Apply filters to transactions
  const applyFilters = useCallback(() => {
    let filtered = [...transactions];

    if (filters.type !== "all") {
      filtered = filtered.filter((tx) => tx.type === filters.type);
    }

    if (filters.dateRange?.from) {
      const fromDate = startOfDay(filters.dateRange.from);
      filtered = filtered.filter((tx) => new Date(tx.created_at) >= fromDate);
    }
    if (filters.dateRange?.to) {
      const toDate = endOfDay(filters.dateRange.to);
      filtered = filtered.filter((tx) => new Date(tx.created_at) <= toDate);
    }

    setFilteredTransactions(filtered);
  }, [transactions, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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

        {/* Low Balance Warning */}
        {!loading && !verifying && wallet && (
          <LowBalanceWarning 
            balance={wallet.balance} 
            onTopUp={() => setFundDialogOpen(true)} 
          />
        )}

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
                  <AnimatedBalance
                    value={wallet?.balance || 0}
                    formatter={formatCurrency}
                    className="text-3xl md:text-4xl font-display font-bold"
                  />
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
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="font-display">Transaction History</CardTitle>
              <CardDescription>Your recent wallet activity</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TransactionExport 
                transactions={filteredTransactions} 
                disabled={loading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide" : "Filter"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showFilters && (
              <div className="mb-6 pb-4 border-b border-border">
                <TransactionFiltersComponent
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </div>
            )}

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
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No matching transactions</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters
                </p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setFilters({ type: "all", dateRange: undefined })}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(filters.type !== "all" || filters.dateRange) && (
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </p>
                )}
                
                {filteredTransactions.map((tx) => (
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
                            hour: "2-digit",
                            minute: "2-digit",
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

        {/* Monthly Spending Summary */}
        {transactions.length > 0 && (
          <MonthlySpendingSummary transactions={transactions} />
        )}

        {/* Saved Payment Cards */}
        <SavedCardsSection 
          onCardCharged={(amount) => {
            setFundedAmount(amount);
            setShowSuccessAnimation(true);
            fetchWalletData();
          }}
        />

        {/* Fund Wallet Dialog */}
        <FundWalletDialog
          open={fundDialogOpen}
          onOpenChange={setFundDialogOpen}
          email={user?.email || ""}
          onSuccess={fetchWalletData}
        />

        {/* Success Animation */}
        <WalletFundedAnimation
          show={showSuccessAnimation}
          amount={fundedAmount}
          onComplete={() => setShowSuccessAnimation(false)}
        />
      </div>
    </DashboardLayout>
  );
};

export default WalletPage;
