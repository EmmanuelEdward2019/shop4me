import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, MessageType, ShoppingListMetadata, InvoiceMetadata, InvoiceResponseMetadata } from "@/types/chat";

interface UseChatOptions {
  orderId?: string;
  receiverId?: string; // For direct messages
}

export const useChat = ({ orderId, receiverId }: UseChatOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
      
      // Type cast the messages properly
      const typedMessages: ChatMessage[] = (data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as MessageType,
        metadata: msg.metadata as unknown as ShoppingListMetadata | InvoiceMetadata | InvoiceResponseMetadata | null,
      }));
      
      setMessages(typedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, orderId, receiverId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!user) return;

    fetchMessages();

    // Set up realtime subscription
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
            metadata: newMessage.metadata as unknown as ShoppingListMetadata | InvoiceMetadata | InvoiceResponseMetadata | null,
          };
          setMessages((prev) => [...prev, typedMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orderId, receiverId, fetchMessages]);

  const sendMessage = async (
    content: string,
    messageType: MessageType = "text",
    metadata?: ShoppingListMetadata | InvoiceMetadata | InvoiceResponseMetadata,
    photoUrl?: string
  ) => {
    if (!user) return;

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
    } catch (error: any) {
      console.error("Error sending message:", error);
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

  const markAsRead = async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    try {
      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .in("id", messageIds)
        .eq("receiver_id", user.id);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    uploadPhoto,
    markAsRead,
    refetch: fetchMessages,
  };
};
