import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface InvoiceData {
  id: string;
  order_id: string;
  agent_id: string;
  buyer_id: string;
  invoice_number: string;
  items: InvoiceLineItem[];
  extra_items: InvoiceLineItem[];
  subtotal: number;
  service_fee: number;
  delivery_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  pdf_url: string | null;
  status: string;
  created_at: string;
}

export interface InvoiceLineItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface UseInvoiceOptions {
  orderId: string;
}

export const useInvoice = ({ orderId }: UseInvoiceOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInvoice({
          ...data,
          items: (data.items as any) || [],
          extra_items: (data.extra_items as any) || [],
        });
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
    } finally {
      setLoading(false);
    }
  }, [user, orderId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const generateInvoiceNumber = async (): Promise<string> => {
    const { data, error } = await supabase.rpc("generate_invoice_number");
    if (error) throw error;
    return data as string;
  };

  const createInvoice = async (invoiceInput: {
    buyerId: string;
    items: InvoiceLineItem[];
    extraItems: InvoiceLineItem[];
    subtotal: number;
    serviceFee: number;
    deliveryFee: number;
    discount: number;
    total: number;
    notes?: string;
  }) => {
    if (!user) return null;
    setCreating(true);
    try {
      const invoiceNumber = await generateInvoiceNumber();

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          order_id: orderId,
          agent_id: user.id,
          buyer_id: invoiceInput.buyerId,
          invoice_number: invoiceNumber,
          items: invoiceInput.items as any,
          extra_items: invoiceInput.extraItems as any,
          subtotal: invoiceInput.subtotal,
          service_fee: invoiceInput.serviceFee,
          delivery_fee: invoiceInput.deliveryFee,
          discount: invoiceInput.discount,
          total: invoiceInput.total,
          notes: invoiceInput.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newInvoice: InvoiceData = {
        ...data,
        items: (data.items as any) || [],
        extra_items: (data.extra_items as any) || [],
      };
      setInvoice(newInvoice);

      // Send email notification to buyer (fire-and-forget)
      supabase.functions
        .invoke("send-invoice-email", {
          body: { invoiceId: data.id },
        })
        .then(({ error: emailError }) => {
          if (emailError) {
            console.error("Failed to send invoice email:", emailError);
          }
        });

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceNumber} has been sent to the buyer`,
      });

      return newInvoice;
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
      return null;
    } finally {
      setCreating(false);
    }
  };

  return {
    invoice,
    loading,
    creating,
    createInvoice,
    refetch: fetchInvoice,
  };
};
