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

interface ExportColumn {
  header: string;
  accessor: (row: any) => string;
}

interface AdminExportProps {
  data: any[];
  columns: ExportColumn[];
  filenamePrefix: string;
  title: string;
  disabled?: boolean;
  summaryItems?: { label: string; value: string }[];
}

const AdminPaymentsExport = ({ data, columns, filenamePrefix, title, disabled, summaryItems = [] }: AdminExportProps) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = columns.map((c) => c.header);
      const rows = data.map((row) => columns.map((c) => c.accessor(row)));

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filenamePrefix}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({ title: "Export Successful", description: `${data.length} records exported to CSV` });
    } catch {
      toast({ title: "Export Failed", description: "Failed to export data", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Pop-up blocked");

      const tableRows = data
        .map(
          (row) =>
            `<tr>${columns.map((c) => `<td>${c.accessor(row)}</td>`).join("")}</tr>`
        )
        .join("");

      const summaryHtml = summaryItems.length
        ? `<div style="display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap">${summaryItems
            .map(
              (s) =>
                `<div style="padding:12px 16px;background:#f5f5f5;border-radius:8px"><div style="font-size:12px;color:#666">${s.label}</div><div style="font-size:18px;font-weight:bold">${s.value}</div></div>`
            )
            .join("")}</div>`
        : "";

      printWindow.document.write(`<!DOCTYPE html><html><head>
        <title>${title} - ${format(new Date(), "MMMM d, yyyy")}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:40px;color:#333}
          h1{color:#1a1a1a;margin-bottom:8px}
          .subtitle{color:#666;margin-bottom:24px}
          table{width:100%;border-collapse:collapse;margin-top:16px}
          th{text-align:left;padding:10px 8px;border-bottom:2px solid #e5e5e5;font-size:12px;color:#666}
          td{padding:10px 8px;border-bottom:1px solid #e5e5e5;font-size:13px}
          @media print{body{padding:20px}}
        </style></head><body>
        <h1>${title}</h1>
        <p class="subtitle">Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")} · ${data.length} records</p>
        ${summaryHtml}
        <table><thead><tr>${columns.map((c) => `<th>${c.header}</th>`).join("")}</tr></thead>
        <tbody>${tableRows}</tbody></table>
        </body></html>`);

      printWindow.document.close();
      printWindow.print();
      toast({ title: "PDF Ready", description: "Use the print dialog to save as PDF" });
    } catch {
      toast({ title: "Export Failed", description: "Please allow pop-ups to generate PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || data.length === 0 || exporting} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="w-4 h-4 mr-2" /> Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminPaymentsExport;
