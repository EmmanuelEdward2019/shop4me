-- Security hardening (audit SEC-8): the public contact form inserts directly
-- into contact_submissions with `WITH CHECK (true)` and no throttle, so it can
-- be spammed. Add a server-side per-email rate limit (max 3 submissions per
-- email per hour) via a BEFORE INSERT trigger — cannot be bypassed from the
-- client. Legitimate users are unaffected.
--
-- (Newsletter subscriptions rely on the unique-email constraint for de-dupe.)

CREATE OR REPLACE FUNCTION public.enforce_contact_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*)
    INTO v_count
    FROM public.contact_submissions
   WHERE lower(email) = lower(NEW.email)
     AND created_at > now() - interval '1 hour';

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Too many submissions from this email. Please try again later.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_rate_limit ON public.contact_submissions;
CREATE TRIGGER trg_contact_rate_limit
  BEFORE INSERT ON public.contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_contact_rate_limit();

CREATE INDEX IF NOT EXISTS idx_contact_submissions_email_created
  ON public.contact_submissions (email, created_at DESC);
