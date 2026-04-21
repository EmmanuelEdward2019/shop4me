import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, MessageType, ShoppingListMetadata, InvoiceMetadata, InvoiceResponseMetadata } from "@/types/chat";

interface UseChatOptions {
  orderId?: string;
  receiverId?: string; // For direct messages
}

type Metadata = ShoppingListMetadata | InvoiceMetadata | InvoiceResponseMetadata;

export const useChat = ({ orderId, receiverId }: UseChatOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (orderId) {
        query = query.eq("order_id", orderId);
      } else if (receiverId) {
        query = query
          .is("order_id", null)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${receiverId},receiver_id.eq.${receiverId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedMessages: ChatMessage[] = (data || []).map((msg) => ({
        ...msg,
        message_type: msg.message_type as MessageType,
        metadata: msg.metadata as unknown as Metadata | null,
      }));

      setMessages(typedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, orderId, receiverId]);

  // Realtime postgres changes subscription
  useEffect(() => {
    if (!user) return;

    fetchMessages();

    const channel = supabase
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
          const newMessage = payload.new as any;
          const typedMessage: ChatMessage = {
            ...newMessage,
            message_type: newMessage.message_type as MessageType,
            metadata: newMessage.metadata as unknown as Metadata | null,
          };
          setMessages((prev) => {
            // Replace optimistic message from same sender with same content if present
            const optimisticIdx = prev.findIndex(
              (m) =>
                (m as any)._optimistic &&
                m.sender_id === typedMessage.sender_id &&
                m.content === typedMessage.content &&
                m.message_type === typedMessage.message_type
            );
            if (optimisticIdx !== -1) {
              const next = [...prev];
              next[optimisticIdx] = typedMessage;
              return next;
            }
            // Dedupe by id
            if (prev.some((m) => m.id === typedMessage.id)) return prev;
            return [...prev, typedMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: orderId ? `order_id=eq.${orderId}` : undefined,
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    is_read: updated.is_read,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orderId, receiverId, fetchMessages]);

  // Presence channel for typing indicator
  useEffect(() => {
    if (!user || (!orderId && !receiverId)) return;

    const channelName = `presence-chat-${orderId || receiverId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing?: boolean; user_id: string }>();
        const typing: string[] = [];
        Object.entries(state).forEach(([key, metas]) => {
          if (key === user.id) return;
          const last = metas[metas.length - 1] as any;
          if (last?.typing) typing.push(key);
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, typing: false });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
      isTypingRef.current = false;
    };
  }, [user, orderId, receiverId]);

  const setTyping = useCallback(
    (typing: boolean) => {
      const channel = presenceChannelRef.current;
      if (!channel || !user) return;

      if (typing) {
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          channel.track({ user_id: user.id, typing: true });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          isTypingRef.current = false;
          channel.track({ user_id: user.id, typing: false });
        }, 3000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingRef.current) {
          isTypingRef.current = false;
          channel.track({ user_id: user.id, typing: false });
        }
      }
    },
    [user]
  );

  const sendMessage = async (
    content: string,
    messageType: MessageType = "text",
    metadata?: Metadata,
    photoUrl?: string
  ) => {
    if (!user) return;

    // Stop typing immediately on send
    setTyping(false);

    // Optimistic message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ChatMessage & { _optimistic?: boolean; _status?: "sending" | "failed" } = {
      id: tempId,
      order_id: orderId || null,
      sender_id: user.id,
      receiver_id: receiverId || null,
      message_type: messageType,
      content: content || null,
      metadata: (metadata as any) ?? null,
      photo_url: photoUrl || null,
      is_read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
      _status: "sending",
    } as any;

    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const { error } = await supabase.from("chat_messages").insert({
        order_id: orderId || null,
        sender_id: user.id,
        receiver_id: receiverId || null,
        message_type: messageType,
        content,
        metadata: metadata as any,
        photo_url: photoUrl,
      });

      if (error) throw error;
      // Realtime echo will replace optimistic message
    } catch (error: any) {
      console.error("Error sending message:", error);
      // Mark optimistic as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? ({ ...(m as any), _status: "failed" } as any) : m
        )
      );
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("chat-photos").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    }
  };

  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!user || messageIds.length === 0) return;
      // Filter out optimistic temp ids
      const realIds = messageIds.filter((id) => !id.startsWith("temp-"));
      if (realIds.length === 0) return;

      try {
        await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .in("id", realIds)
          .eq("receiver_id", user.id);

        // Optimistic local update (covers order chats where receiver_id is null)
        setMessages((prev) =>
          prev.map((m) =>
            realIds.includes(m.id) ? { ...m, is_read: true } : m
          )
        );
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    },
    [user]
  );

  // Also support order-chat read marking (no receiver_id) via a broader update
  const markOrderMessagesRead = useCallback(
    async (messageIds: string[]) => {
      if (!user || !orderId || messageIds.length === 0) return;
      const realIds = messageIds.filter((id) => !id.startsWith("temp-"));
      if (realIds.length === 0) return;

      try {
        await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .in("id", realIds)
          .eq("order_id", orderId)
          .neq("sender_id", user.id);

        setMessages((prev) =>
          prev.map((m) =>
            realIds.includes(m.id) ? { ...m, is_read: true } : m
          )
        );
      } catch (error) {
        console.error("Error marking order messages as read:", error);
      }
    },
    [user, orderId]
  );

  return {
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    uploadPhoto,
    markAsRead,
    markOrderMessagesRead,
    setTyping,
    refetch: fetchMessages,
  };
};
