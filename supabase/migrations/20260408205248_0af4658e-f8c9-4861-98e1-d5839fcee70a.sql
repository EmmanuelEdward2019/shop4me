-- Add assigned_agent_id to stores for dedicated store-agent routing
ALTER TABLE public.stores
ADD COLUMN assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX idx_stores_assigned_agent ON public.stores(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;

COMMENT ON COLUMN public.stores.assigned_agent_id IS 'Dedicated agent for this store. If set, order notifications go only to this agent.';