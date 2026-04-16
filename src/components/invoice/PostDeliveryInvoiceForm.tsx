import { useState } from "react";
import { Receipt, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceLineItem } from "@/hooks/useInvoice";

interface OrderItemData {
  id: string;
  name: string;
  quantity: number;
  actual_price: number | null;
  estimated_price: number | null;
}

interface PostDeliveryInvoiceFormProps {
  orderItems: OrderItemData[];
  serviceFeePercentage: number;
  deliveryFee: number;
  onSubmit: (data: {
    items: InvoiceLineItem[];
    extraItems: InvoiceLineItem[];
    subtotal: number;
    serviceFee: number;
    deliveryFee: number;
    discount: number;
    total: number;
    notes?: string;
  }) => void;
  disabled?: boolean;
}

export const PostDeliveryInvoiceForm = ({
  orderItems,
  serviceFeePercentage,
  deliveryFee,
  onSubmit,
  disabled,
}: PostDeliveryInvoiceFormProps) => {
  const [items] = useState<InvoiceLineItem[]>(
    orderItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.actual_price || item.estimated_price || 0,
      total: (item.actual_price || item.estimated_price || 0) * item.quantity,
    }))
  );

  const [notes, setNotes] = useState("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const serviceFee = Math.round(subtotal * (serviceFeePercentage / 100));
  const total = subtotal + serviceFee + deliveryFee;

  const handleSubmit = () => {
    onSubmit({
      items,
      extraItems: [],
      subtotal,
      serviceFee,
      deliveryFee,
      discount: 0,
      total,
      notes: notes || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="w-5 h-5" />
          Generate Shop4Me Invoice
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create a final invoice for this completed delivery
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Order Items */}
        <div>
          <Label className="text-sm font-semibold">Order Items</Label>
          <div className="mt-2 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-semibold">Invoice Notes (Optional)</Label>
          <Textarea
            placeholder="Thank you for shopping with Shop4Me!"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1"
          />
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Fee ({serviceFeePercentage}%)</span>
            <span>{formatCurrency(serviceFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={disabled || total <= 0}>
          <Send className="w-4 h-4 mr-2" />
          Send Invoice to Buyer
        </Button>
      </CardContent>
    </Card>
  );
};
