
-- Create a trigger function that auto-assigns the correct role when an application is approved
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_role app_role;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') AND NEW.user_id IS NOT NULL THEN
    -- Determine role based on role_type
    IF NEW.role_type = 'rider' THEN
      v_new_role := 'rider';
    ELSE
      v_new_role := 'agent';
    END IF;
    
    -- Update existing buyer role to the new role, or insert if not exists
    -- First try to update the existing 'buyer' role
    UPDATE public.user_roles
    SET role = v_new_role
    WHERE user_id = NEW.user_id AND role = 'buyer';
    
    -- If no buyer role was updated, insert the new role (in case they already have a different role)
    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, v_new_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  -- If status changed to 'suspended' or 'rejected', revert to buyer
  IF NEW.status IN ('suspended', 'rejected') AND OLD.status = 'approved' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.user_roles
    SET role = 'buyer'
    WHERE user_id = NEW.user_id AND role IN ('agent', 'rider');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on agent_applications
DROP TRIGGER IF EXISTS on_application_status_change ON public.agent_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.agent_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_application_approval();
