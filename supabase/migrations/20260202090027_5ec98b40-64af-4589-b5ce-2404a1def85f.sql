-- Create admin announcements table for broadcast messages
CREATE TABLE public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_announcements
CREATE POLICY "Admins can create announcements"
  ON public.admin_announcements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all announcements"
  ON public.admin_announcements FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view announcements"
  ON public.admin_announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete announcements"
  ON public.admin_announcements FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to send direct messages to any user
CREATE POLICY "Admins can send direct messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') 
    AND auth.uid() = sender_id 
    AND order_id IS NULL
  );

-- Add RLS policy for admins to view all direct messages
CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));