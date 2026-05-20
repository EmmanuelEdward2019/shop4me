import { useMemo, useState } from "react";
import { Receipt, Check, Edit, Minus, Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { InvoiceMetadata, InvoiceItem } from "@/types/chat";
import { normalizeInvoiceMetadata } from "@/lib/invoiceMetadata";

interface InvoiceMessageProps {
  // Accept loosely-shaped metadata so invoices produced by clients that
  // serialize fields as snake_case (e.g. the RN app: `actual_price`,
  // `items_total`, `service_fee`, etc.) still render correctly. We
  // normalize to the canonical camelCase shape immediately.
  metadata: InvoiceMetadata | Record<string, unknown>;
  isOwn: boolean;
  onAction?: (action: "approve" | "edit", changes?: any) => void;
}

export const InvoiceMessage = ({ metadata: rawMetadata, isOwn, onAction }: InvoiceMessageProps) => {
  const metadata = useMemo(() => normalizeInvoiceMetadata(rawMetadata), [rawMetadata]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<InvoiceItem[]>(
    (metadata?.items || []).map((item) => ({
      ...item,
      quantity: item.quantity ?? 1,
      actualPrice: item.actualPrice ?? 0,
    }))
  );
  const [substituteRequests, setSubstituteRequests] = useState<Record<string, string>>({});

  if (!metadata?.items || metadata.items.length === 0) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount ?? 0);
  };

  const safeItems = (isEditing ? editedItems : metadata.items).map((item) => ({
    ...item,
    quantity: item.quantity ?? 1,
    actualPrice: item.actualPrice ?? 0,
  }));

  const editedItemsTotal = editedItems.reduce(
    (sum, item) => sum + (item.actualPrice ?? 0) * (item.quantity ?? 1),
    0
  );

  const calculateTotal = () => {
    const serviceFee = editedItemsTotal * 0.1;
    return editedItemsTotal + serviceFee + (metadata.deliveryFee ?? 0);
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setEditedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(0, (item.quantity ?? 1) + delta) }
          : item
      )
    );
  };

  // The buyer can propose a different price during negotiation. Empty
  // input is treated as "keep the agent's price" — we never overwrite the
  // prefilled value with 0 silently.
  const handlePriceChange = (itemId: string, raw: string) => {
    setEditedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const original = metadata.items.find((o) => o.id === itemId);
        const originalPrice = original?.actualPrice ?? item.actualPrice ?? 0;
        if (raw === "") {
          return { ...item, actualPrice: originalPrice };
        }
        const parsed = parseFloat(raw);
        if (Number.isNaN(parsed) || parsed < 0) return item;
        return { ...item, actualPrice: parsed };
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setEditedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubstituteRequest = (itemId: string, request: string) => {
    setSubstituteRequests((prev) => ({ ...prev, [itemId]: request }));
  };

  const handleApprove = () => {
    if (isEditing) {
      const changes = editedItems
        .flatMap((edited) => {
          const original = metadata.items.find((o) => o.id === edited.id);
          if (!original) return [{ itemId: edited.id, action: "remove" as const }];
          const out: any[] = [];
          const editedQty = edited.quantity ?? 1;
          const originalQty = original.quantity ?? 1;
          if (editedQty !== originalQty) {
            out.push({
              itemId: edited.id,
              action: "quantity_change" as const,
              newQuantity: editedQty,
            });
          }
          // Buyer-proposed price differs from the agent's invoice price.
          // Surfaced as its own change-record so the agent's revised
          // invoice form picks it up via initialItems.actualPrice.
          const originalPrice = original.actualPrice ?? 0;
          const editedPrice = edited.actualPrice ?? 0;
          if (editedPrice !== originalPrice) {
            out.push({
              itemId: edited.id,
              action: "price_change" as const,
              newPrice: editedPrice,
            });
          }
          return out;
        });

      const removed = metadata.items
        .filter((orig) => !editedItems.find((e) => e.id === orig.id))
        .map((item) => ({ itemId: item.id, action: "remove" as const }));

      const substitutes = Object.entries(substituteRequests)
        .filter(([_, request]) => request.trim())
        .map(([itemId, request]) => ({
          itemId,
          action: "substitute_request" as const,
          substituteRequest: request,
        }));

      onAction?.("edit", {
        editedItems,
        changes: [...changes, ...removed, ...substitutes],
        approvedTotal: calculateTotal(),
      });
    } else {
      onAction?.("approve", { approvedTotal: metadata.finalTotal });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "found":
        return <Badge variant="default" className="text-xs">Found</Badge>;
      case "not_found":
        return <Badge variant="destructive" className="text-xs">Not Found</Badge>;
      case "substitute":
        return <Badge variant="secondary" className="text-xs">Substitute</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-2 font-medium">
        <Receipt className="w-4 h-4" />
        <span>Invoice</span>
      </div>

      <div className="space-y-2">
        {safeItems.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-start gap-2 text-sm">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="truncate min-w-0 flex-1">{item.name}</span>
                <span className="shrink-0">{getStatusBadge(item.status)}</span>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleQuantityChange(item.id, -1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-xs">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleQuantityChange(item.id, 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <span className="shrink-0 ml-1 whitespace-nowrap text-right">
                  x{item.quantity} @ {formatCurrency(item.actualPrice)}
                </span>
              )}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-[11px] text-muted-foreground shrink-0">Price (₦)</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-7 text-xs w-28"
                  value={item.actualPrice > 0 ? item.actualPrice : ""}
                  placeholder={String(
                    metadata.items.find((o) => o.id === item.id)?.actualPrice ?? 0
                  )}
                  onChange={(e) => handlePriceChange(item.id, e.target.value)}
                  onBlur={(e) => {
                    // Empty / zero on blur → restore the agent's original
                    // price. Buyer can clear the field to "abandon" their
                    // proposal without losing the prefilled value.
                    if (
                      e.target.value === "" ||
                      Number(e.target.value) <= 0
                    ) {
                      handlePriceChange(item.id, "");
                    }
                  }}
                />
                <span className="text-[11px] text-muted-foreground">
                  = {formatCurrency((item.actualPrice ?? 0) * (item.quantity ?? 1))}
                </span>
              </div>
            )}
            {item.photoUrl && (
              <img
                src={item.photoUrl}
                alt={item.name}
                className="w-16 h-16 object-cover rounded cursor-pointer"
                onClick={() => window.open(item.photoUrl, "_blank")}
              />
            )}
            {isEditing && item.status === "not_found" && (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Request substitute..."
                  className="h-7 text-xs"
                  value={substituteRequests[item.id] || ""}
                  onChange={(e) => handleSubstituteRequest(item.id, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <span className="opacity-70 shrink-0">Items Total</span>
          <span className="shrink-0 font-medium">
            {formatCurrency(isEditing ? editedItemsTotal : (metadata.itemsTotal ?? 0))}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="opacity-70 shrink-0">Service Fee (10%)</span>
          <span className="shrink-0">
            {formatCurrency(isEditing ? editedItemsTotal * 0.1 : (metadata.serviceFee ?? 0))}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="opacity-70 shrink-0">Delivery Fee</span>
          <span className="shrink-0">{formatCurrency(metadata.deliveryFee ?? 0)}</span>
        </div>
        <Separator />
        <div className="flex justify-between gap-2 font-semibold">
          <span className="shrink-0">Total</span>
          <span className="shrink-0">{formatCurrency(isEditing ? calculateTotal() : (metadata.finalTotal ?? 0))}</span>
        </div>
      </div>

      {!isOwn && onAction && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant={isEditing ? "outline" : "default"}
            className="flex-1"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-3 h-3 mr-1" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button size="sm" className="flex-1" onClick={handleApprove}>
            <Check className="w-3 h-3 mr-1" />
            {isEditing ? "Confirm Changes" : "Approve & Pay"}
          </Button>
        </div>
      )}
    </div>
  );
};
