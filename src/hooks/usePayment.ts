import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InitializePaymentParams {
  orderId: string;
  amount: number;
  email: string;
  callbackUrl?: string;
}

interface PaymentResult {
  success: boolean;
  authorization_url?: string;
  access_code?: string;
  reference?: string;
  payment_id?: string;
  error?: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initializePayment = async (params: InitializePaymentParams): Promise<PaymentResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: params,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Payment initialization failed");
      }

      return data;
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Payment verification failed");
      }

      if (data.status === "success") {
        toast({
          title: "Payment Successful",
          description: "Your payment has been confirmed",
        });
      }

      return data;
    } catch (error: any) {
      console.error("Payment verification error:", error);
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const redirectToPayment = async (params: InitializePaymentParams) => {
    const result = await initializePayment(params);
    
    if (result.success && result.authorization_url) {
      // Redirect to Paystack payment page
      window.location.href = result.authorization_url;
    }
    
    return result;
  };

  return {
    loading,
    initializePayment,
    verifyPayment,
    redirectToPayment,
  };
};
