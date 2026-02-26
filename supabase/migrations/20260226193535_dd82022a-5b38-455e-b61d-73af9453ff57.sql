-- Create compliance_actions table to track warnings and suspensions
CREATE TABLE public.compliance_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'suspension', 'reinstatement')),
  reason TEXT NOT NULL,
  notes TEXT,
  target_role TEXT NOT NULL CHECK (target_role IN ('agent', 'rider')),
  compliance_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage compliance actions
CREATE POLICY "Admins can view all compliance actions"
  ON public.compliance_actions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create compliance actions"
  ON public.compliance_actions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_compliance_actions_target ON public.compliance_actions(target_user_id);
CREATE INDEX idx_compliance_actions_type ON public.compliance_actions(action_type);