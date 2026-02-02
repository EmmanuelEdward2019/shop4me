import { useState } from "react";
import { Receipt, Camera, Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceItem, InvoiceMetadata, ShoppingListItem } from "@/types/chat";

interface AgentInvoiceFormProps {
  shoppingList: ShoppingListItem[];
  onSubmit: (invoice: InvoiceMetadata) => void;
  onUploadPhoto: (file: File) => Promise<string | null>;
  disabled?: boolean;
}

export const AgentInvoiceForm = ({
  shoppingList,
  onSubmit,
  onUploadPhoto,
  disabled,
}: AgentInvoiceFormProps) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const itemsTotal = items
    .filter((i) => i.status !== "not_found")
    .reduce((sum, item) => sum + item.actualPrice * item.quantity, 0);
  const serviceFee = itemsTotal * 0.1;
  const deliveryFee = 1500;
  const finalTotal = itemsTotal + serviceFee + deliveryFee;

  const handleSubmit = () => {
    const invoice: InvoiceMetadata = {
      items,
      itemsTotal,
      serviceFee,
      deliveryFee,
      finalTotal,
      notes: notes || undefined,
    };
    onSubmit(invoice);
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

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items Total</span>
            <span>{formatCurrency(itemsTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Fee (10%)</span>
            <span>{formatCurrency(serviceFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(finalTotal)}</span>
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={disabled}>
          <Send className="w-4 h-4 mr-2" />
          Send Invoice to Customer
        </Button>
      </CardContent>
    </Card>
  );
};
