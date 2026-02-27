
-- Create expo_push_tokens table for React Native mobile app
CREATE TABLE public.expo_push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  device_name TEXT,
  platform TEXT DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own expo tokens"
  ON public.expo_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own tokens
CREATE POLICY "Users can view their own expo tokens"
  ON public.expo_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own expo tokens"
  ON public.expo_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own expo tokens"
  ON public.expo_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can read all (for edge function)
CREATE POLICY "Service role can read all expo tokens"
  ON public.expo_push_tokens FOR SELECT
  USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER update_expo_push_tokens_updated_at
  BEFORE UPDATE ON public.expo_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_expo_push_tokens_user_id ON public.expo_push_tokens(user_id);
