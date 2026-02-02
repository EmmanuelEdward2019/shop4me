import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  reference: string | null;
  created_at: string;
}

interface TransactionExportProps {
  transactions: Transaction[];
  disabled?: boolean;
}

const TransactionExport = ({ transactions, disabled }: TransactionExportProps) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ["Date", "Description", "Type", "Amount", "Reference"];
      const rows = transactions.map((tx) => [
        format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss"),
        tx.description || (tx.type === "credit" ? "Deposit" : "Payment"),
        tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
        `${tx.type === "credit" ? "+" : "-"}${Math.abs(tx.amount)}`,
        tx.reference || "-",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `wallet-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: "Export Successful",
        description: `${transactions.length} transactions exported to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export transactions",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Create a printable HTML document
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("Pop-up blocked");
      }

      const totalCredits = transactions
        .filter((tx) => tx.type === "credit")
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalDebits = transactions
        .filter((tx) => tx.type === "debit")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Wallet Transactions - ${format(new Date(), "MMMM d, yyyy")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1a1a1a; margin-bottom: 8px; }
            .subtitle { color: #666; margin-bottom: 24px; }
            .summary { display: flex; gap: 24px; margin-bottom: 24px; }
            .summary-item { padding: 12px 16px; background: #f5f5f5; border-radius: 8px; }
            .summary-label { font-size: 12px; color: #666; }
            .summary-value { font-size: 18px; font-weight: bold; }
            .credit { color: #16a34a; }
            .debit { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e5e5e5; font-size: 12px; color: #666; }
            td { padding: 12px 8px; border-bottom: 1px solid #e5e5e5; }
            .amount { font-weight: 500; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Wallet Transaction History</h1>
          <p class="subtitle">Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Credits</div>
              <div class="summary-value credit">${formatCurrency(totalCredits)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Debits</div>
              <div class="summary-value debit">${formatCurrency(totalDebits)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Transactions</div>
              <div class="summary-value">${transactions.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactions
                .map(
                  (tx) => `
                <tr>
                  <td>${format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}</td>
                  <td>${tx.description || (tx.type === "credit" ? "Deposit" : "Payment")}</td>
                  <td>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
                  <td class="amount ${tx.type}" style="text-align: right;">
                    ${tx.type === "credit" ? "+" : "-"}${formatCurrency(Math.abs(tx.amount))}
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();

      toast({
        title: "PDF Ready",
        description: "Use the print dialog to save as PDF",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please allow pop-ups.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || transactions.length === 0 || exporting}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TransactionExport;
