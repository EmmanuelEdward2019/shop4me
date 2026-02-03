-- Fix RLS Security Vulnerabilities

-- 1. Add explicit deny for anonymous users on sensitive tables
-- Profiles table - only authenticated users can access their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Wallets table - only authenticated users can access their own wallet
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;

CREATE POLICY "Users can view their own wallet" 
ON public.wallets FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Wallet transactions - only authenticated users can view their own
DROP POLICY IF EXISTS "Users can view their wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Users can view their wallet transactions" 
ON public.wallet_transactions FOR SELECT 
TO authenticated
USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

-- Agent applications - only authenticated users can manage their own
DROP POLICY IF EXISTS "Users can view their own applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.agent_applications;

CREATE POLICY "Users can view their own applications" 
ON public.agent_applications FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own applications" 
ON public.agent_applications FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own applications" 
ON public.agent_applications FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can update all applications" 
ON public.agent_applications FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Chat messages - only authenticated participants can access
DROP POLICY IF EXISTS "Users can view messages for their orders" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages for their orders" ON public.chat_messages;

CREATE POLICY "Users can view messages for their orders" 
ON public.chat_messages FOR SELECT 
TO authenticated
USING (
  sender_id = auth.uid() OR 
  receiver_id = auth.uid() OR
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid() OR agent_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert messages for their orders" 
ON public.chat_messages FOR INSERT 
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Orders table - only authenticated users
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Agents can view available orders" ON public.orders;
DROP POLICY IF EXISTS "Agents can update assigned orders" ON public.orders;

CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  agent_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin') OR
  (status = 'pending' AND public.has_role(auth.uid(), 'agent'))
);

CREATE POLICY "Users can insert their own orders" 
ON public.orders FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and agents can update orders" 
ON public.orders FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() OR 
  agent_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

-- Order items - only authenticated users
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can update order items" ON public.order_items;

CREATE POLICY "Users can view order items" 
ON public.order_items FOR SELECT 
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE user_id = auth.uid() OR agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can insert order items" 
ON public.order_items FOR INSERT 
TO authenticated
WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

CREATE POLICY "Agents can update order items" 
ON public.order_items FOR UPDATE 
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  )
);

-- Delivery addresses - only authenticated users
DROP POLICY IF EXISTS "Users can view their addresses" ON public.delivery_addresses;
DROP POLICY IF EXISTS "Users can insert their addresses" ON public.delivery_addresses;
DROP POLICY IF EXISTS "Users can update their addresses" ON public.delivery_addresses;
DROP POLICY IF EXISTS "Users can delete their addresses" ON public.delivery_addresses;

CREATE POLICY "Users can view their addresses" 
ON public.delivery_addresses FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their addresses" 
ON public.delivery_addresses FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their addresses" 
ON public.delivery_addresses FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their addresses" 
ON public.delivery_addresses FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Payment cards - only authenticated users
DROP POLICY IF EXISTS "Users can view their cards" ON public.payment_cards;
DROP POLICY IF EXISTS "Users can insert their cards" ON public.payment_cards;
DROP POLICY IF EXISTS "Users can update their cards" ON public.payment_cards;
DROP POLICY IF EXISTS "Users can delete their cards" ON public.payment_cards;

CREATE POLICY "Users can view their cards" 
ON public.payment_cards FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their cards" 
ON public.payment_cards FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their cards" 
ON public.payment_cards FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their cards" 
ON public.payment_cards FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- User roles - only admins can modify, users can view their own
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" 
ON public.user_roles FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" 
ON public.user_roles FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" 
ON public.user_roles FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Push subscriptions - only authenticated users
DROP POLICY IF EXISTS "Users can manage their subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view their subscriptions" 
ON public.push_subscriptions FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their subscriptions" 
ON public.push_subscriptions FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their subscriptions" 
ON public.push_subscriptions FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Agent earnings - only authenticated agents/admins
DROP POLICY IF EXISTS "Agents can view their earnings" ON public.agent_earnings;

CREATE POLICY "Agents can view their earnings" 
ON public.agent_earnings FOR SELECT 
TO authenticated
USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Agent reviews - authenticated users can view, buyers can insert
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Buyers can insert reviews" ON public.agent_reviews;

CREATE POLICY "Authenticated users can view reviews" 
ON public.agent_reviews FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Buyers can insert reviews for their orders" 
ON public.agent_reviews FOR INSERT 
TO authenticated
WITH CHECK (
  buyer_id = auth.uid() AND
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- Agent locations - only order participants can view
DROP POLICY IF EXISTS "Order participants can view agent location" ON public.agent_locations;
DROP POLICY IF EXISTS "Agents can update their location" ON public.agent_locations;

CREATE POLICY "Order participants can view agent location" 
ON public.agent_locations FOR SELECT 
TO authenticated
USING (
  agent_id = auth.uid() OR
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Agents can insert their location" 
ON public.agent_locations FOR INSERT 
TO authenticated
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their location" 
ON public.agent_locations FOR UPDATE 
TO authenticated
USING (agent_id = auth.uid());

-- Delivery updates - only order participants
DROP POLICY IF EXISTS "Order participants can view updates" ON public.delivery_updates;
DROP POLICY IF EXISTS "Agents can insert updates" ON public.delivery_updates;

CREATE POLICY "Order participants can view updates" 
ON public.delivery_updates FOR SELECT 
TO authenticated
USING (
  agent_id = auth.uid() OR
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Agents can insert updates" 
ON public.delivery_updates FOR INSERT 
TO authenticated
WITH CHECK (agent_id = auth.uid());

-- Payments - only authenticated users for their own payments
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;

CREATE POLICY "Users can view their payments" 
ON public.payments FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Fix overly permissive contact submissions - still allow public insert but with rate limiting consideration
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can view submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.contact_submissions;

-- Allow anonymous inserts for contact form but admins manage
CREATE POLICY "Anyone can submit contact form" 
ON public.contact_submissions FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view submissions" 
ON public.contact_submissions FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update submissions" 
ON public.contact_submissions FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix newsletter subscriptions - allow public subscribe
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can view subscriptions" ON public.newsletter_subscriptions;

CREATE POLICY "Anyone can subscribe" 
ON public.newsletter_subscriptions FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view subscriptions" 
ON public.newsletter_subscriptions FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Blog posts - public read for published, admins manage
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage posts" ON public.blog_posts;

CREATE POLICY "Anyone can view published posts" 
ON public.blog_posts FOR SELECT 
TO anon, authenticated
USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert posts" 
ON public.blog_posts FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update posts" 
ON public.blog_posts FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete posts" 
ON public.blog_posts FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin announcements - only admins
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.admin_announcements;

CREATE POLICY "Admins can view announcements" 
ON public.admin_announcements FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert announcements" 
ON public.admin_announcements FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add performance indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON public.orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON public.chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON public.delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_cards_user_id ON public.payment_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_agent_id ON public.agent_earnings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_locations_order_id ON public.agent_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_updates_order_id ON public.delivery_updates(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Create atomic wallet balance update function to prevent race conditions
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Lock the wallet row for update
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_wallet_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  -- For debits, check sufficient balance
  IF p_type = 'debit' THEN
    SELECT balance INTO v_new_balance FROM public.wallets WHERE id = v_wallet_id;
    IF v_new_balance < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
  END IF;
  
  -- Update balance atomically
  UPDATE public.wallets
  SET balance = CASE 
    WHEN p_type = 'credit' THEN balance + p_amount
    WHEN p_type = 'debit' THEN balance - p_amount
    ELSE balance
  END,
  updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;
  
  -- Create transaction record
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, description, reference)
  VALUES (v_wallet_id, p_amount, p_type, p_description, p_reference)
  RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

-- Create account deletion function
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user is deleting their own account
  IF auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Delete user data in order (respecting foreign keys)
  DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.payment_cards WHERE user_id = p_user_id;
  DELETE FROM public.delivery_addresses WHERE user_id = p_user_id;
  DELETE FROM public.agent_applications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  
  -- Note: Wallet and wallet_transactions will be handled by cascade or separate cleanup
  -- Orders are kept for record-keeping but anonymized
  UPDATE public.orders SET notes = 'User account deleted' WHERE user_id = p_user_id;
  
  RETURN json_build_object('success', true);
END;
$$;