CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role;
  v_meta_role TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Determine role
  v_meta_role := NEW.raw_user_meta_data->>'role';
  
  IF v_meta_role = 'delivery_rider' THEN
    v_role := 'rider'::app_role;
  ELSIF v_meta_role = 'shopping_agent' OR v_meta_role = 'both' THEN
    v_role := 'agent'::app_role;
  ELSE
    v_role := 'buyer'::app_role;
  END IF;

  -- Create role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);
  
  -- Create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
