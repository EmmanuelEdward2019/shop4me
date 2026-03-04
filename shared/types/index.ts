/**
 * Shop4Me Shared Types Package
 * ============================
 * Platform-agnostic types used by BOTH the web app and React Native app.
 * Import from "@shop4me/shared-types" (mobile) or "@/shared/types" (web).
 *
 * IMPORTANT: This file must NOT import React, DOM, or platform-specific code.
 */

// ─── Enums & Literals ────────────────────────────────────────────────

export type AppRole = "buyer" | "agent" | "admin" | "rider";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "shopping"
  | "items_confirmed"
  | "payment_pending"
  | "paid"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type ApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended";

export type MessageType =
  | "text"
  | "shopping_list"
  | "invoice"
  | "invoice_response"
  | "photo"
  | "status_update"
  | "system";

export type PaymentProvider = "paystack" | "wallet";
export type PaymentStatus = "pending" | "success" | "failed";
export type WalletTransactionType = "credit" | "debit";
export type InvoiceStatus = "draft" | "sent" | "approved" | "paid" | "disputed";

// ─── User & Auth ─────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// ─── Orders ──────────────────────────────────────────────────────────

export interface Order {
  id: string;
  user_id: string;
  agent_id: string | null;
  location_name: string;
  location_type: string;
  status: OrderStatus;
  notes: string | null;
  estimated_total: number | null;
  final_total: number | null;
  service_fee: number | null;
  delivery_fee: number | null;
  delivery_address_id: string | null;
  estimated_minutes: number | null;
  timer_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  description: string | null;
  estimated_price: number | null;
  actual_price: number | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─── Chat & Messaging ───────────────────────────────────────────────

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
  unit?: string;
  unitLabel?: string;
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

// ─── Invoices (DB model) ────────────────────────────────────────────

export interface Invoice {
  id: string;
  order_id: string;
  agent_id: string;
  buyer_id: string;
  invoice_number: string;
  items: InvoiceLineItem[];
  extra_items: InvoiceLineItem[] | null;
  subtotal: number;
  service_fee: number;
  delivery_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  pdf_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// ─── Wallet & Payments ──────────────────────────────────────────────

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  provider: string;
  provider_reference: string | null;
  provider_response: Record<string, unknown> | null;
  payment_method: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentCard {
  id: string;
  user_id: string;
  authorization_code: string;
  card_type: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string | null;
  brand: string | null;
  nickname: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Delivery & Location ────────────────────────────────────────────

export interface DeliveryAddress {
  id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  landmark: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentLocation {
  id: string;
  agent_id: string;
  order_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  proximity_notified: boolean | null;
  updated_at: string;
}

export interface DeliveryUpdate {
  id: string;
  order_id: string;
  agent_id: string;
  update_type: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// ─── Agent ──────────────────────────────────────────────────────────

export interface AgentApplication {
  id: string;
  user_id: string | null;
  role_type: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string | null;
  address: string;
  city: string;
  state: string;
  lga: string | null;
  id_type: string;
  id_number: string;
  id_document_url: string | null;
  photo_url: string | null;
  bank_name: string;
  account_number: string;
  account_name: string;
  has_smartphone: boolean | null;
  has_vehicle: boolean | null;
  vehicle_type: string | null;
  market_knowledge: string[] | null;
  experience_description: string | null;
  how_heard_about_us: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentEarning {
  id: string;
  agent_id: string;
  order_id: string | null;
  type: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export interface AgentReview {
  id: string;
  order_id: string;
  agent_id: string;
  buyer_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Rider ──────────────────────────────────────────────────────────

export interface RiderAlert {
  id: string;
  order_id: string;
  agent_id: string;
  rider_id: string | null;
  store_location_name: string;
  store_latitude: number | null;
  store_longitude: number | null;
  order_packed: boolean;
  rider_arrived_at: string | null;
  order_picked_up_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─── Notifications ──────────────────────────────────────────────────

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

export interface ExpoPushToken {
  id: string;
  user_id: string;
  token: string;
  device_name: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Content ────────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscription {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface ContactSubmission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  responded_at: string | null;
  created_at: string;
}

// ─── Platform ───────────────────────────────────────────────────────

export interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface ComplianceAction {
  id: string;
  admin_id: string;
  target_user_id: string;
  target_role: string;
  action_type: string;
  reason: string;
  notes: string | null;
  compliance_score: number | null;
  created_at: string;
}

export interface AdminAnnouncement {
  id: string;
  sender_id: string;
  title: string;
  content: string;
  created_at: string;
}

// ─── Edge Function Payloads ─────────────────────────────────────────

export interface PaystackInitializePayload {
  email: string;
  amount: number; // kobo
  orderId?: string;
  callbackUrl?: string; // shop4me://payment-callback for mobile
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyPayload {
  reference: string;
}

export interface WalletTopupPayload {
  email: string;
  amount: number; // kobo
  callbackUrl?: string;
}

export interface WalletPayPayload {
  orderId: string;
  amount: number;
}

export interface ChargeCardPayload {
  authorization_code: string;
  email: string;
  amount: number; // kobo
  orderId?: string;
}

export interface SendPushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface SendEmailPayload {
  type: "welcome" | "order_confirmed" | "order_delivered" | "password_reset" | "agent_approved" | "agent_rejected";
  data: Record<string, unknown>;
}

export interface SendInvoiceEmailPayload {
  invoiceId: string;
  buyerEmail: string;
  buyerName: string;
}

// ─── Deep Link Routes ───────────────────────────────────────────────

/**
 * Deep link routes for the mobile app (shop4me:// scheme).
 * Used by push notifications and payment callbacks.
 */
export const DEEP_LINK_ROUTES = {
  PAYMENT_CALLBACK: "shop4me://payment-callback",
  WALLET_CALLBACK: "shop4me://wallet-callback",
  ORDER_DETAIL: (id: string) => `shop4me://order/${id}`,
  CHAT: (orderId: string) => `shop4me://chat/${orderId}`,
  WALLET: "shop4me://wallet",
  DASHBOARD: "shop4me://dashboard",
} as const;

// ─── Realtime Channel Names ─────────────────────────────────────────

export const REALTIME_CHANNELS = {
  orderChat: (orderId: string) => `chat-${orderId}`,
  orderUpdates: (orderId: string) => `order-${orderId}`,
  agentLocation: (orderId: string) => `agent-location-${orderId}`,
  walletBalance: (userId: string) => `wallet-${userId}`,
} as const;

// ─── Branding Constants ─────────────────────────────────────────────

export const BRAND = {
  name: "Shop4Me",
  tagline: "Your personal shopping assistant",
  colors: {
    primaryGreen: "#1F7A4D",
    primaryGreenLight: "#27965E",
    primaryGreenDark: "#176339",
    accentOrange: "#F4A261",
    accentOrangeLight: "#F7BC8A",
    accentOrangeDark: "#E08C3B",
    backgroundLight: "#F9FAFB",
    backgroundDark: "#111827",
    surfaceLight: "#FFFFFF",
    surfaceDark: "#1F2937",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textOnPrimary: "#FFFFFF",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  fonts: {
    display: "Playfair Display",
    body: "Inter",
  },
  storage: {
    buckets: {
      avatars: "avatars",
      chatPhotos: "chat-photos",
      agentDocuments: "agent-documents",
    },
  },
} as const;
