import { useState, useEffect } from "react";
import { Receipt, Send, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
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
  /** GPS context for tiered delivery fee calc */
  storeLat?: number | null;
  storeLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  buyerZone?: string | null;
  storeZone?: string | null;
  initialIsHeavy?: boolean;
  onSubmit: (data: {
    items: InvoiceLineItem[];
    extraItems: InvoiceLineItem[];
    subtotal: number;
    serviceFee: number;
    deliveryFee: number;
    discount: number;
    total: number;
    notes?: string;
    isHeavyOrder: boolean;
  }) => void;
  disabled?: boolean;
}

export const PostDeliveryInvoiceForm = ({
  orderItems,
  storeLat,
  storeLng,
  deliveryLat,
  deliveryLng,
  buyerZone,
  storeZone,
  initialIsHeavy = false,
  onSubmit,
  disabled,
}: PostDeliveryInvoiceFormProps) => {
  const { fees, getServicePercentage, getQuote } = usePlatformSettings();
  const [items] = useState<InvoiceLineItem[]>(
    orderItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.actual_price || item.estimated_price || 0,
      total: (item.actual_price || item.estimated_price || 0) * item.quantity,
    })),
  );
  const [notes, setNotes] = useState("");
  const [isHeavyOrder, setIsHeavyOrder] = useState(initialIsHeavy);
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const previewPct = getServicePercentage(subtotal);
  const previewServiceFee = Math.round((subtotal * previewPct) / 100);
  const previewDeliveryBase = fees.defaultDeliveryFee;
  const previewSurge = fees.surgeActive
    ? Math.round(previewDeliveryBase * fees.surgeMultiplier) - previewDeliveryBase
    : 0;
  const previewHeavy = isHeavyOrder ? fees.heavySurcharge : 0;
  const previewDeliveryFee = Math.max(
    fees.minDeliveryFee,
    previewDeliveryBase + previewSurge + previewHeavy,
  );
  const previewTotal = subtotal + previewServiceFee + previewDeliveryFee;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const quote = await getQuote({
        subtotal,
        store_lat: storeLat ?? null,
        store_lng: storeLng ?? null,
        delivery_lat: deliveryLat ?? null,
        delivery_lng: deliveryLng ?? null,
        buyer_zone: buyerZone ?? null,
        store_zone: storeZone ?? null,
        is_heavy_order: isHeavyOrder,
      });
      onSubmit({
        items,
        extraItems: [],
        subtotal: quote.subtotal,
        serviceFee: quote.service_fee,
        deliveryFee: quote.delivery_fee,
        discount: 0,
        total: quote.total,
        notes: notes || undefined,
        isHeavyOrder,
      });
    } finally {
      setSubmitting(false);
    }
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

        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="flex items-start gap-2">
            <PackageOpen className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">Heavy / bulk order</Label>
              <p className="text-xs text-muted-foreground">
                Adds {formatCurrency(fees.heavySurcharge)} to delivery for large or weighty loads.
              </p>
            </div>
          </div>
          <Switch checked={isHeavyOrder} onCheckedChange={setIsHeavyOrder} />
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Fee ({previewPct}%)</span>
            <span>{formatCurrency(previewServiceFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Delivery Fee
              {fees.surgeActive ? <Badge variant="outline" className="ml-2 h-4 text-[10px]">Surge</Badge> : null}
              {isHeavyOrder ? <Badge variant="outline" className="ml-2 h-4 text-[10px]">Heavy</Badge> : null}
            </span>
            <span>{formatCurrency(previewDeliveryFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(previewTotal)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Final amount is calculated by the platform when you send the invoice.
          </p>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={disabled || submitting || subtotal <= 0}>
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Calculating…" : "Send Invoice to Buyer"}
        </Button>
      </CardContent>
    </Card>
  );
};
