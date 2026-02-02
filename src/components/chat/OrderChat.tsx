import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { usePayment } from "@/hooks/usePayment";
import type { InvoiceMetadata } from "@/types/chat";

interface OrderChatProps {
  orderId: string;
  orderTotal?: number;
  userEmail?: string;
  className?: string;
}

export const OrderChat = ({ orderId, orderTotal, userEmail, className }: OrderChatProps) => {
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage, uploadPhoto } = useChat({ orderId });
  const { redirectToPayment, loading: paymentLoading } = usePayment();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage(content, "text");
  };

  const handlePhotoUpload = async (file: File) => {
    const photoUrl = await uploadPhoto(file);
    if (photoUrl) {
      sendMessage("", "photo", undefined, photoUrl);
    }
  };

  const handleInvoiceAction = async (
    action: "approve" | "edit",
    changes?: any
  ) => {
    if (action === "approve" && orderTotal && userEmail) {
      // Redirect to payment
      await redirectToPayment({
        orderId,
        amount: changes?.approvedTotal || orderTotal,
        email: userEmail,
        callbackUrl: `${window.location.origin}/orders/${orderId}`,
      });
    } else if (action === "edit") {
      // Send invoice response message
      await sendMessage(
        "I've made some changes to the invoice",
        "invoice_response",
        {
          invoiceId: orderId,
          action: "edited",
          changes: changes?.changes,
          approvedTotal: changes?.approvedTotal,
        }
      );
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <Skeleton className="h-16 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              onInvoiceAction={
                message.message_type === "invoice" && message.sender_id !== user?.id
                  ? handleInvoiceAction
                  : undefined
              }
            />
          ))
        )}
      </ScrollArea>
      <ChatInput
        onSend={handleSendMessage}
        onPhotoUpload={handlePhotoUpload}
        disabled={sending || paymentLoading}
      />
    </div>
  );
};
