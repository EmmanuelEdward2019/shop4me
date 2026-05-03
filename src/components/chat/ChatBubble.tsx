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
      case "invoice_response":
        return (
          <div className="space-y-1 min-w-[200px]">
            <div className="flex items-center gap-1.5 font-medium text-sm">
              <Receipt className="w-3.5 h-3.5" />
              Invoice Changes Requested
            </div>
            <p className="text-sm opacity-90">{message.content}</p>
            {(message.metadata as any)?.approvedTotal && (
              <p className="text-xs opacity-70">
                Expected total: {fmtNGN((message.metadata as any).approvedTotal)}
              </p>
            )}
          </div>
        );
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

  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/50 rounded-full px-4 py-1 text-xs text-muted-foreground">
          {message.content}
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
        <div
          className={cn(
            "flex items-center gap-1 mt-1 text-[10px]",
            isOwn ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
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
      </div>
    </div>
  );
};
