import { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { UnreadDivider } from "./UnreadDivider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { PaymentMethodDialog } from "@/components/payment/PaymentMethodDialog";
import { format, isToday, isYesterday } from "date-fns";

const getDateLabel = (date: Date): string => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

interface OrderChatProps {
  orderId: string;
  orderTotal?: number;
  userEmail?: string;
  className?: string;
}

export const OrderChat = ({ orderId, orderTotal, userEmail, className }: OrderChatProps) => {
  const { user } = useAuth();
  const {
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    uploadPhoto,
    setTyping,
    markOrderMessagesRead,
  } = useChat({ orderId });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingReadRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Capture the index of the first unread incoming message ONCE per chat session
  // so the divider stays put while the user reads.
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const firstUnreadLockedRef = useRef(false);

  useEffect(() => {
    if (firstUnreadLockedRef.current || loading || !user) return;
    const firstUnread = messages.find(
      (m) => !m.is_read && m.sender_id !== user.id
    );
    if (firstUnread) {
      setFirstUnreadId(firstUnread.id);
      firstUnreadLockedRef.current = true;
    } else if (messages.length > 0) {
      // No unread — lock so divider never appears later in this session
      firstUnreadLockedRef.current = true;
    }
  }, [messages, loading, user]);

  const unreadCount = useMemo(() => {
    if (!firstUnreadId || !user) return 0;
    return messages.filter((m) => !m.is_read && m.sender_id !== user.id).length;
  }, [messages, firstUnreadId, user]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Flush queued read-marks in batches to avoid chatty requests
  const queueRead = (id: string) => {
    pendingReadRef.current.add(id);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      const ids = Array.from(pendingReadRef.current);
      pendingReadRef.current.clear();
      if (ids.length > 0) markOrderMessagesRead(ids);
    }, 400);
  };

  // Set up IntersectionObserver for auto-read
  useEffect(() => {
    if (!user) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = (entry.target as HTMLElement).dataset.messageId;
          const senderId = (entry.target as HTMLElement).dataset.senderId;
          const isRead = (entry.target as HTMLElement).dataset.isRead === "true";
          if (!id || !senderId || isRead) return;
          if (senderId === user.id) return; // never mark own messages
          if (id.startsWith("temp-")) return;
          queueRead(id);
        });
      },
      { threshold: 0.6 }
    );

    return () => {
      observerRef.current?.disconnect();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const messageRefCallback = (el: HTMLDivElement | null) => {
    if (el && observerRef.current) {
      observerRef.current.observe(el);
    }
  };

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
      setPaymentAmount(changes?.approvedTotal || orderTotal);
      setShowPaymentDialog(true);
    } else if (action === "edit") {
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
    <>
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
          ) : (() => {
            let lastDateLabel = "";
            return messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              const showDivider = firstUnreadId === message.id && unreadCount > 0;
              const msgDate = new Date(message.created_at);
              const dateLabel = getDateLabel(msgDate);
              const showDateSeparator = dateLabel !== lastDateLabel;
              if (showDateSeparator) lastDateLabel = dateLabel;
              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-3">
                      <span className="bg-muted/70 text-muted-foreground text-xs px-3 py-1 rounded-full">
                        {dateLabel}
                      </span>
                    </div>
                  )}
                  {showDivider && <UnreadDivider count={unreadCount} />}
                  <div
                    ref={messageRefCallback}
                    data-message-id={message.id}
                    data-sender-id={message.sender_id}
                    data-is-read={String(message.is_read)}
                  >
                    <ChatBubble
                      message={message as any}
                      isOwn={isOwn}
                      onInvoiceAction={
                        message.message_type === "invoice" && !isOwn
                          ? handleInvoiceAction
                          : undefined
                      }
                    />
                  </div>
                </div>
              );
            });
          })()
          }
          {typingUsers.length > 0 && <TypingIndicator />}
        </ScrollArea>
        <ChatInput
          onSend={handleSendMessage}
          onPhotoUpload={handlePhotoUpload}
          onTyping={setTyping}
          disabled={sending}
        />
      </div>

      <PaymentMethodDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        orderId={orderId}
        amount={paymentAmount}
        email={userEmail || ""}
      />
    </>
  );
};
