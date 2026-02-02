import type { Database } from "@/integrations/supabase/types";

export type MessageType = "text" | "shopping_list" | "invoice" | "invoice_response" | "photo" | "status_update" | "system";

export interface ChatMessage {
  id: string;
  order_id: string | null;
  sender_id: string;
  receiver_id: string | null;
  message_type: MessageType;
  content: string | null;
  metadata: ShoppingListMetadata | InvoiceMetadata | InvoiceResponseMetadata | null;
  photo_url: string | null;
  is_read: boolean;
  created_at: string;
  sender_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice?: number;
  description?: string;
}

export interface ShoppingListMetadata {
  items: ShoppingListItem[];
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice?: number;
  actualPrice: number;
  photoUrl?: string;
  status: "found" | "not_found" | "substitute";
  substituteNote?: string;
}

export interface InvoiceMetadata {
  items: InvoiceItem[];
  itemsTotal: number;
  serviceFee: number;
  deliveryFee: number;
  finalTotal: number;
  notes?: string;
}

export interface InvoiceResponseMetadata {
  invoiceId: string;
  action: "approved" | "edited";
  changes?: {
    itemId: string;
    action: "remove" | "quantity_change" | "substitute_request";
    newQuantity?: number;
    substituteRequest?: string;
  }[];
  approvedTotal?: number;
}
