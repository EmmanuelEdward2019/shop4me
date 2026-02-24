import { useState } from "react";
import { Receipt, Plus, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  serviceFee: number;
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
  serviceFee: defaultServiceFee,
  deliveryFee: defaultDeliveryFee,
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

  const [extraItems, setExtraItems] = useState<InvoiceLineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [serviceFee] = useState(defaultServiceFee);
  const [deliveryFee] = useState(defaultDeliveryFee);

  const addExtraItem = () => {
    setExtraItems([...extraItems, { name: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const updateExtraItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...extraItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    setExtraItems(updated);
  };

  const removeExtraItem = (index: number) => {
    setExtraItems(extraItems.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);

  const itemsSubtotal = items.reduce((sum, i) => sum + i.total, 0);
  const extrasSubtotal = extraItems.reduce((sum, i) => sum + i.total, 0);
  const subtotal = itemsSubtotal + extrasSubtotal;
  const total = subtotal + serviceFee + deliveryFee - discount;

  const handleSubmit = () => {
    onSubmit({
      items,
      extraItems: extraItems.filter((i) => i.name.trim()),
      subtotal,
      serviceFee,
      deliveryFee,
      discount,
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

        {/* Extra Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Additional Charges (Optional)</Label>
            <Button type="button" variant="outline" size="sm" onClick={addExtraItem}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          {extraItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
              <div className="col-span-5">
                <Input
                  placeholder="Description"
                  value={item.name}
                  onChange={(e) => updateExtraItem(i, "name", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  min={1}
                  onChange={(e) => updateExtraItem(i, "quantity", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  placeholder="Price"
                  value={item.unit_price || ""}
                  onChange={(e) => updateExtraItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeExtraItem(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Discount */}
        <div>
          <Label className="text-sm font-semibold">Discount (₦)</Label>
          <Input
            type="number"
            value={discount || ""}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="mt-1"
          />
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
            <span>{formatCurrency(itemsSubtotal)}</span>
          </div>
          {extrasSubtotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional Charges</span>
              <span>{formatCurrency(extrasSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Fee</span>
            <span>{formatCurrency(serviceFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
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
