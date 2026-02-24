
-- Create invoices table for post-delivery billing records
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  agent_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on order_id (one invoice per order)
CREATE UNIQUE INDEX idx_invoices_order_id ON public.invoices(order_id);

-- Create index for invoice number lookups
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Agents can create invoices for their delivered orders
CREATE POLICY "Agents can create invoices for delivered orders"
ON public.invoices
FOR INSERT
WITH CHECK (
  auth.uid() = agent_id
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = invoices.order_id
    AND orders.agent_id = auth.uid()
    AND orders.status = 'delivered'
  )
);

-- Agents can view their own invoices
CREATE POLICY "Agents can view their invoices"
ON public.invoices
FOR SELECT
USING (auth.uid() = agent_id);

-- Buyers can view invoices for their orders
CREATE POLICY "Buyers can view their invoices"
ON public.invoices
FOR SELECT
USING (auth.uid() = buyer_id);

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
ON public.invoices
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can update their invoices (e.g., add PDF URL)
CREATE POLICY "Agents can update their invoices"
ON public.invoices
FOR UPDATE
USING (auth.uid() = agent_id);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence-like function for invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM public.invoices;
  v_number := 'S4M-INV-' || LPAD(v_count::TEXT, 6, '0');
  RETURN v_number;
END;
$$;
