-- Create agent application status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'suspended');

-- Create agent applications table
CREATE TABLE public.agent_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  
  -- Address
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  lga TEXT,
  
  -- Role preference
  role_type TEXT NOT NULL DEFAULT 'shopping_agent', -- shopping_agent, delivery_rider, both
  
  -- Identification
  id_type TEXT NOT NULL, -- nin, voters_card, drivers_license, passport
  id_number TEXT NOT NULL,
  id_document_url TEXT,
  
  -- Bank Details
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  
  -- Additional Info
  has_smartphone BOOLEAN DEFAULT true,
  has_vehicle BOOLEAN DEFAULT false,
  vehicle_type TEXT, -- motorcycle, bicycle, car, none
  market_knowledge TEXT[], -- list of markets/malls they know
  experience_description TEXT,
  how_heard_about_us TEXT,
  
  -- Photo
  photo_url TEXT,
  
  -- Application Status
  status application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.agent_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own applications
CREATE POLICY "Users can create applications"
ON public.agent_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their pending applications
CREATE POLICY "Users can update pending applications"
ON public.agent_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.agent_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all applications
CREATE POLICY "Admins can update all applications"
ON public.agent_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete applications
CREATE POLICY "Admins can delete applications"
ON public.agent_applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_agent_applications_updated_at
BEFORE UPDATE ON public.agent_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for agent documents
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-documents', 'agent-documents', false);

-- Storage policies for agent documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'agent-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all agent documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'agent-documents' AND has_role(auth.uid(), 'admin'));

-- Allow admins to delete user roles (for suspending/removing agents)
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));