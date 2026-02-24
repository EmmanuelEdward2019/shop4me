import { Receipt, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { InvoiceData } from "@/hooks/useInvoice";

interface InvoiceViewProps {
  invoice: InvoiceData;
  customerName?: string;
  locationName?: string;
}

export const InvoiceView = ({ invoice, customerName, locationName }: InvoiceViewProps) => {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);

  const handleDownloadPDF = () => {
    // Generate a printable invoice in a new window
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #F97316; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: 800; color: #F97316; }
    .logo span { color: #1a1a1a; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { font-size: 24px; color: #F97316; margin-bottom: 8px; }
    .invoice-info p { font-size: 13px; color: #666; }
    .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .details div { font-size: 13px; line-height: 1.8; }
    .details strong { display: block; font-size: 14px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #F97316; color: white; text-align: left; padding: 12px; font-size: 13px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:nth-child(even) { background: #fafafa; }
    .totals { float: right; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals .grand-total { font-size: 18px; font-weight: 700; color: #F97316; border-top: 2px solid #F97316; padding-top: 10px; margin-top: 6px; }
    .discount { color: #16a34a; }
    .footer { clear: both; margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999; }
    .notes { clear: both; margin-top: 40px; padding: 16px; background: #fff7ed; border-radius: 8px; font-size: 13px; }
    .notes strong { color: #F97316; }
    .contact { margin-top: 10px; font-size: 11px; color: #999; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Shop<span>4Me</span></div>
      <p style="font-size:12px;color:#666;margin-top:4px;">Your Personal Shopping Assistant</p>
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>${invoice.invoice_number}</strong></p>
      <p>Date: ${new Date(invoice.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  </div>

  <div class="details">
    <div>
      <strong>Bill To:</strong>
      ${customerName || "Customer"}
    </div>
    <div style="text-align:right;">
      <strong>Location:</strong>
      ${locationName || "N/A"}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item) => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">₦${item.unit_price.toLocaleString()}</td>
          <td style="text-align:right;">₦${item.total.toLocaleString()}</td>
        </tr>
      `).join("")}
      ${invoice.extra_items.map((item) => `
        <tr>
          <td>${item.name} <em style="color:#999;">(additional)</em></td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">₦${item.unit_price.toLocaleString()}</td>
          <td style="text-align:right;">₦${item.total.toLocaleString()}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>₦${invoice.subtotal.toLocaleString()}</span></div>
    <div><span>Service Fee</span><span>₦${invoice.service_fee.toLocaleString()}</span></div>
    <div><span>Delivery Fee</span><span>₦${invoice.delivery_fee.toLocaleString()}</span></div>
    ${invoice.discount > 0 ? `<div class="discount"><span>Discount</span><span>-₦${invoice.discount.toLocaleString()}</span></div>` : ""}
    <div class="grand-total"><span>Total</span><span>₦${invoice.total.toLocaleString()}</span></div>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}

  <div class="footer">
    <p>Thank you for shopping with Shop4Me!</p>
    <p class="contact">Support: Support@shop4meng.com | WhatsApp: 07047008840</p>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="w-5 h-5 text-primary" />
            Shop4Me Invoice
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {invoice.invoice_number}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Issued {new Date(invoice.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-2">
          {invoice.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {item.name} <span className="text-muted-foreground">x{item.quantity}</span>
              </span>
              <span className="font-medium">{formatCurrency(item.total)}</span>
            </div>
          ))}
          {invoice.extra_items.map((item, i) => (
            <div key={`extra-${i}`} className="flex justify-between text-sm">
              <span>
                {item.name} <span className="text-muted-foreground">x{item.quantity}</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">extra</Badge>
              </span>
              <span className="font-medium">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Fee</span>
            <span>{formatCurrency(invoice.service_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span>{formatCurrency(invoice.delivery_fee)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>Discount</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <span className="font-medium">Notes: </span>
            {invoice.notes}
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Invoice sent</span>
        </div>

        <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
          <Download className="w-4 h-4 mr-2" />
          Download / Print Invoice
        </Button>
      </CardContent>
    </Card>
  );
};
