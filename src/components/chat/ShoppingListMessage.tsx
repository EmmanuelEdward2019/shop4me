import { ShoppingCart } from "lucide-react";
import type { ShoppingListMetadata } from "@/types/chat";

interface ShoppingListMessageProps {
  metadata: ShoppingListMetadata;
}

export const ShoppingListMessage = ({ metadata }: ShoppingListMessageProps) => {
  if (!metadata?.items) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium">
        <ShoppingCart className="w-4 h-4" />
        <span>Shopping List ({metadata.items.length} items)</span>
      </div>
      <div className="space-y-1 text-sm">
        {metadata.items.map((item, index) => (
          <div key={item.id} className="flex justify-between">
            <span>
              {index + 1}. {item.name} x{item.quantity}
            </span>
            {item.estimatedPrice && (
              <span className="opacity-70">~{formatCurrency(item.estimatedPrice)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
