-- Create message types enum
CREATE TYPE public.message_type AS ENUM (
  'text',
  'shopping_list',
  'invoice',
  'invoice_response',
  'photo',
  'status_update',
  'system'
);

-- Create chat messages table for order-based and general conversations
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID,
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  metadata JSONB,
  photo_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_chat_messages_order_id ON public.chat_messages(order_id);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their orders (as buyer)
CREATE POLICY "Buyers can view messages for their orders"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = chat_messages.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Agents can view messages for their assigned orders
CREATE POLICY "Agents can view messages for their orders"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = chat_messages.order_id 
    AND orders.agent_id = auth.uid()
  )
);

-- Users can send messages for their orders
CREATE POLICY "Buyers can send messages for their orders"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = chat_messages.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Agents can send messages for their assigned orders
CREATE POLICY "Agents can send messages for their orders"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = chat_messages.order_id 
    AND orders.agent_id = auth.uid()
  )
);

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON public.chat_messages FOR UPDATE
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- Direct messages (no order_id) - sender or receiver can view
CREATE POLICY "Users can view their direct messages"
ON public.chat_messages FOR SELECT
USING (
  order_id IS NULL 
  AND (sender_id = auth.uid() OR receiver_id = auth.uid())
);

-- Users can send direct messages
CREATE POLICY "Users can send direct messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND order_id IS NULL
);

-- Create storage bucket for chat photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-photos', 'chat-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload chat photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-photos' 
  AND auth.role() = 'authenticated'
);

-- Anyone can view chat photos (public bucket)
CREATE POLICY "Chat photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-photos');

-- Users can delete their own photos
CREATE POLICY "Users can delete their own chat photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);