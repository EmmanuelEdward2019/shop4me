import { useState } from "react";
import { Plus, Trash2, ShoppingCart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShoppingListItem } from "@/types/chat";

interface ShoppingListFormProps {
  onSubmit: (items: ShoppingListItem[]) => void;
  disabled?: boolean;
}

export const ShoppingListForm = ({ onSubmit, disabled }: ShoppingListFormProps) => {
  const [items, setItems] = useState<ShoppingListItem[]>([
    { id: crypto.randomUUID(), name: "", quantity: 1 },
  ]);

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), name: "", quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ShoppingListItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = () => {
    const validItems = items.filter((item) => item.name.trim());
    if (validItems.length > 0) {
      onSubmit(validItems);
      setItems([{ id: crypto.randomUUID(), name: "", quantity: 1 }]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const estimatedTotal = items.reduce(
    (sum, item) => sum + (item.estimatedPrice || 0) * item.quantity,
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="w-5 h-5" />
          Add Shopping List
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Item {index + 1}</span>
              {items.length > 1 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Item Name *</Label>
                <Input
                  placeholder="e.g., Golden Penny Rice 5kg"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Est. Price (₦)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={item.estimatedPrice || ""}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "estimatedPrice",
                        parseFloat(e.target.value) || undefined
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Input
                  placeholder="Any specific brand or details..."
                  value={item.description || ""}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addItem}>
          <Plus className="w-4 h-4 mr-2" />
          Add Another Item
        </Button>

        {estimatedTotal > 0 && (
          <div className="flex justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Estimated Total</span>
            <span className="font-medium">{formatCurrency(estimatedTotal)}</span>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={disabled || !items.some((i) => i.name.trim())}
        >
          <Send className="w-4 h-4 mr-2" />
          Send Shopping List
        </Button>
      </CardContent>
    </Card>
  );
};
