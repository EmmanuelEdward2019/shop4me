/**
 * Re-export chat types from the shared package.
 * Existing imports throughout the web app (from "@/types/chat") continue to work.
 */
export type {
  MessageType,
  ChatMessage,
  ShoppingListItem,
  ShoppingListMetadata,
  InvoiceItem,
  InvoiceMetadata,
  InvoiceResponseMetadata,
} from "@shared/types";
