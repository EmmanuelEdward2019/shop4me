import { useEffect, useState } from "react";
import { Receipt, Camera, Send, Check, X, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { InvoiceItem, InvoiceMetadata, ShoppingListItem } from "@/types/chat";

interface AgentInvoiceFormProps {
  shoppingList: ShoppingListItem[];
  /** Optional GPS context — passed to the canonical fee calculator. */
  storeLat?: number | null;
  storeLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  buyerZone?: string | null;
  storeZone?: string | null;
  initialIsHeavy?: boolean;
  onSubmit: (invoice: InvoiceMetadata, isHeavyOrder: boolean) => void;
  onUploadPhoto: (file: File) => Promise<string | null>;
  disabled?: boolean;
}

export const AgentInvoiceForm = ({
  shoppingList,
  storeLat,
  storeLng,
  deliveryLat,
  deliveryLng,
  buyerZone,
  storeZone,
  initialIsHeavy = false,
  onSubmit,
  onUploadPhoto,
  disabled,
}: AgentInvoiceFormProps) => {
  const { fees, getServicePercentage, getQuote } = usePlatformSettings();
  const [items, setItems] = useState<InvoiceItem[]>(
    shoppingList.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      estimatedPrice: item.estimatedPrice,
      actualPrice: item.estimatedPrice || 0,
      status: "found" as const,
    }))
  );
  const [notes, setNotes] = useState("");
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const [isHeavyOrder, setIsHeavyOrder] = useState(initialIsHeavy);

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    setUploadingPhotoFor(itemId);
    const photoUrl = await onUploadPhoto(file);
    if (photoUrl) {
      updateItem(itemId, "photoUrl", photoUrl);
    }
    setUploadingPhotoFor(null);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);

  const itemsTotal = items
    .filter((i) => i.status !== "not_found")
    .reduce((sum, item) => sum + item.actualPrice * item.quantity, 0);

  // Live preview: tiered service fee + default delivery fee (admin-controlled).
  // Final numbers are re-fetched from the edge function on submit so admin
  // changes to surge / heavy / tiers always win.
  const previewPct = getServicePercentage(itemsTotal);
  const previewServiceFee = Math.round((itemsTotal * previewPct) / 100);
  const previewDeliveryBase = fees.defaultDeliveryFee;
  const previewSurge = fees.surgeActive
    ? Math.round(previewDeliveryBase * fees.surgeMultiplier) - previewDeliveryBase
    : 0;
  const previewHeavy = isHeavyOrder ? fees.heavySurcharge : 0;
  const previewDeliveryFee = Math.max(
    fees.minDeliveryFee,
    previewDeliveryBase + previewSurge + previewHeavy,
  );
  const previewTotal = itemsTotal + previewServiceFee + previewDeliveryFee;

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Get authoritative numbers from the edge function
      const quote = await getQuote({
        subtotal: itemsTotal,
        store_lat: storeLat ?? null,
        store_lng: storeLng ?? null,
        delivery_lat: deliveryLat ?? null,
        delivery_lng: deliveryLng ?? null,
        buyer_zone: buyerZone ?? null,
        store_zone: storeZone ?? null,
        is_heavy_order: isHeavyOrder,
      });
      const invoice: InvoiceMetadata = {
        items,
        itemsTotal: quote.subtotal,
        serviceFee: quote.service_fee,
        deliveryFee: quote.delivery_fee,
        finalTotal: quote.total,
        notes: notes || undefined,
      };
      onSubmit(invoice, isHeavyOrder);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="w-5 h-5" />
          Create Invoice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                <Badge variant="outline">x{item.quantity}</Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={item.status === "found" ? "default" : "outline"}
                  className="h-7 px-2"
                  onClick={() => updateItem(item.id, "status", "found")}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant={item.status === "not_found" ? "destructive" : "outline"}
                  className="h-7 px-2"
                  onClick={() => updateItem(item.id, "status", "not_found")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {item.status === "found" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Actual Price (₦)</Label>
                  <Input
                    type="number"
                    value={item.actualPrice}
                    onChange={(e) =>
                      updateItem(item.id, "actualPrice", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Photo (optional)</Label>
                  <div className="flex gap-2">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(item.id, file);
                          }}
                          disabled={uploadingPhotoFor === item.id}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-10"
                          disabled={uploadingPhotoFor === item.id}
                          asChild
                        >
                          <span>
                            <Camera className="w-4 h-4" />
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {item.status === "not_found" && (
              <p className="text-sm text-destructive">Item not available</p>
            )}

            {item.estimatedPrice && (
              <p className="text-xs text-muted-foreground">
                Customer estimated: {formatCurrency(item.estimatedPrice)}
              </p>
            )}
          </div>
        ))}

        <div>
          <Label className="text-xs">Notes for customer (optional)</Label>
          <Textarea
            placeholder="Any notes about availability, substitutes, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Heavy/bulk toggle — only knob the agent has */}
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

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items Total</span>
            <span>{formatCurrency(itemsTotal)}</span>
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

        <Button className="w-full" onClick={handleSubmit} disabled={disabled || submitting}>
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Calculating…" : "Send Invoice to Customer"}
        </Button>
      </CardContent>
    </Card>
  );
};
