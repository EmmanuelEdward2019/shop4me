import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck, Loader2, AlertCircle, Receipt } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { ShoppingListMessage } from "./ShoppingListMessage";
import { InvoiceMessage } from "./InvoiceMessage";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);

interface ChatBubbleProps {
  message: ChatMessage & { _optimistic?: boolean; _status?: "sending" | "failed" };
  isOwn: boolean;
  onInvoiceAction?: (action: "approve" | "edit", changes?: any) => void;
}

export const ChatBubble = ({ message, isOwn, onInvoiceAction }: ChatBubbleProps) => {
  const renderContent = () => {
    switch (message.message_type) {
      case "shopping_list":
        return <ShoppingListMessage metadata={message.metadata as any} />;
      case "invoice":
        return (
          <InvoiceMessage
            metadata={message.metadata as any}
            isOwn={isOwn}
            onAction={onInvoiceAction}
          />
        );
      case "photo":
        return (
          <div className="space-y-2">
            {message.photo_url && (
              <img
                src={message.photo_url}
                alt="Shared photo"
                className="rounded-lg max-w-[280px] cursor-pointer hover:opacity-90"
                onClick={() => window.open(message.photo_url!, "_blank")}
              />
            )}
            {message.content && <p>{message.content}</p>}
          </div>
        );
      case "invoice_response": {
        const meta = message.metadata as any;
        const editedItems: Array<{ id: string; name: string; quantity: number; actualPrice: number }> =
          meta?.editedItems || [];
        const approvedTotal: number | undefined = meta?.approvedTotal;
        const itemsSubtotal = editedItems.reduce(
          (sum, item) => sum + item.actualPrice * item.quantity,
          0
        );
        return (
          <div className="space-y-2 min-w-[240px]">
            <div className="flex items-center gap-1.5 font-medium text-sm">
              <Receipt className="w-3.5 h-3.5" />
              Customer Requested Changes
            </div>
            <p className="text-sm opacity-90">{message.content}</p>
            {editedItems.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-current/20">
                <p className="text-[11px] font-semibold uppercase opacity-60 tracking-wide">
                  Revised Items
                </p>
                {editedItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs gap-3">
                    <span className="opacity-90">
                      {item.name} <span className="opacity-60">×{item.quantity}</span>
                    </span>
                    <span className="shrink-0">{fmtNGN(item.actualPrice * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-current/20 pt-1 space-y-0.5">
                  <div className="flex justify-between text-xs opacity-70">
                    <span>Subtotal</span>
                    <span>{fmtNGN(itemsSubtotal)}</span>
                  </div>
                  {approvedTotal && (
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Expected Total</span>
                      <span>{fmtNGN(approvedTotal)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }
      case "status_update":
        return (
          <div className="flex items-center gap-2 text-sm italic">
            <Check className="w-4 h-4" />
            <span>{message.content}</span>
          </div>
        );
      case "system":
        return (
          <div className="text-center text-sm text-muted-foreground py-2">
            {message.content}
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap">{message.content}</p>;
    }
  };

  const timestamp = (
    <div
      className={cn(
        "flex items-center gap-1 mt-1 text-[10px]",
        message.message_type === "invoice"
          ? "text-muted-foreground justify-end"
          : isOwn
          ? "text-primary-foreground/70 justify-end"
          : "text-muted-foreground"
      )}
    >
      <span>{format(new Date(message.created_at), "HH:mm")}</span>
      {isOwn && (
        message._status === "sending" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : message._status === "failed" ? (
          <AlertCircle className="w-3 h-3 text-destructive" />
        ) : message.is_read ? (
          <CheckCheck className="w-3 h-3" />
        ) : (
          <Check className="w-3 h-3" />
        )
      )}
    </div>
  );

  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/50 rounded-full px-4 py-1 text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  // Invoice messages use a neutral card so internal badges, separators and
  // text all render correctly regardless of who sent the invoice.
  if (message.message_type === "invoice") {
    return (
      <div className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}>
        <div className="w-[92%] rounded-2xl px-4 py-3 bg-card border text-foreground overflow-hidden">
          {renderContent()}
          {timestamp}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {renderContent()}
        {timestamp}
      </div>
    </div>
  );
};
