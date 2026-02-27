import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChatMessage,
  MessageType,
  ShoppingListMetadata,
  InvoiceMetadata,
  InvoiceResponseMetadata,
} from "@shared/types";

type ChatMetadata = ShoppingListMetadata | InvoiceMetadata | InvoiceResponseMetadata;

interface UseOrderChatOptions {
  client: SupabaseClient;
  userId: string | undefined;
  orderId?: string;
  receiverId?: string;
}

interface UseOrderChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (
    content: string,
    messageType?: MessageType,
    metadata?: ChatMetadata,
    photoUrl?: string
  ) => Promise<boolean>;
  uploadPhoto: (file: File | Blob, fileName?: string) => Promise<string | null>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useOrderChat = ({
  client,
  userId,
  orderId,
  receiverId,
}: UseOrderChatOptions): UseOrderChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      let query = client
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (orderId) {
        query = query.eq("order_id", orderId);
      } else if (receiverId) {
        query = query
          .is("order_id", null)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .or(`sender_id.eq.${receiverId},receiver_id.eq.${receiverId}`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const typedMessages: ChatMessage[] = (data || []).map((msg: any) => ({
        ...msg,
        message_type: msg.message_type as MessageType,
        metadata: msg.metadata as ChatMessage["metadata"],
      }));

      setMessages(typedMessages);
    } catch (err: any) {
      console.error("useOrderChat: fetch error", err);
      setError(err.message || "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  }, [client, userId, orderId, receiverId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = client
      .channel(`chat-${orderId || receiverId || "direct"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: orderId ? `order_id=eq.${orderId}` : undefined,
        },
        (payload) => {
          const newMsg = payload.new as any;
          const typed: ChatMessage = {
            ...newMsg,
            message_type: newMsg.message_type as MessageType,
            metadata: newMsg.metadata as ChatMessage["metadata"],
          };
          setMessages((prev) => {
            // Deduplicate (optimistic insert may have added it already)
            if (prev.some((m) => m.id === typed.id)) return prev;
            return [...prev, typed];
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, userId, orderId, receiverId]);

  const sendMessage = async (
    content: string,
    messageType: MessageType = "text",
    metadata?: ChatMetadata,
    photoUrl?: string
  ): Promise<boolean> => {
    if (!userId) return false;

    setSending(true);
    try {
      const { error: insertError } = await client.from("chat_messages").insert({
        order_id: orderId || null,
        sender_id: userId,
        receiver_id: receiverId || null,
        message_type: messageType,
        content,
        metadata: metadata as any,
        photo_url: photoUrl,
      });

      if (insertError) throw insertError;
      return true;
    } catch (err: any) {
      console.error("useOrderChat: send error", err);
      setError(err.message || "Failed to send message");
      return false;
    } finally {
      setSending(false);
    }
  };

  const uploadPhoto = async (
    file: File | Blob,
    fileName?: string
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      const ext = fileName?.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await client.storage
        .from("chat-photos")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = client.storage.from("chat-photos").getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      console.error("useOrderChat: upload error", err);
      setError(err.message || "Failed to upload photo");
      return null;
    }
  };

  const markAsRead = async (messageIds: string[]): Promise<void> => {
    if (!userId || messageIds.length === 0) return;

    try {
      await client
        .from("chat_messages")
        .update({ is_read: true })
        .in("id", messageIds)
        .eq("receiver_id", userId);
    } catch (err: any) {
      console.error("useOrderChat: markAsRead error", err);
    }
  };

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    uploadPhoto,
    markAsRead,
    refetch: fetchMessages,
  };
};
