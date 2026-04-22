# Shop4Me — Complete API & Backend Documentation for React Native Mobile App

> **Last Updated:** 2026-02-27
> **Purpose:** Master reference for building a React Native (Expo) mobile app that shares the same Supabase backend as the existing web application.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Branding & Design System](#2-branding--design-system)
3. [Supabase Connection](#3-supabase-connection)
4. [Authentication](#4-authentication)
5. [Database Schema](#5-database-schema)
6. [Edge Functions (API Endpoints)](#6-edge-functions-api-endpoints)
7. [Realtime Subscriptions](#7-realtime-subscriptions)
8. [Storage Buckets](#8-storage-buckets)
9. [Push Notifications (Expo)](#9-push-notifications-expo)
10. [Deep Linking & Payment Callbacks](#10-deep-linking--payment-callbacks)
11. [Role-Based Navigation](#11-role-based-navigation)
12. [Shared Types Package](#12-shared-types-package)
13. [Shared Hooks Package](#13-shared-hooks-package)
14. [Capacitor Native Plugins](#14-capacitor-native-plugins)
15. [Haptic Feedback Integration](#15-haptic-feedback-integration)
16. [Master Prompt for AI Code Generation](#16-master-prompt-for-ai-code-generation)


---

## 1. Project Overview

| Field | Value |
|-------|-------|
| **App Name** | Shop4Me |
| **Web URL** | https://www.shop4meng.com / https://www.shop4meng.com |
| **Platform** | Personal shopping & delivery service in Nigeria |
| **Roles** | Buyer, Agent (personal shopper), Rider (delivery), Admin |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Storage, Realtime) |
| **Payments** | Paystack (server-side redirect via Edge Functions) |
| **Emails** | Resend API |

### Core User Flow
1. **Buyer** creates an order → selects store/market + delivery address
2. **Agent** accepts the order → shops items → sends invoice via chat
3. **Buyer** reviews & pays invoice (wallet or card via Paystack)
4. **Agent** marks order packed → **Rider** picks up & delivers
5. **Buyer** rates the agent

---

## 2. Branding & Design System

### Primary Colors

| Color | Name | Hex | HSL | Usage |
|-------|------|-----|-----|-------|
| 🟢 | **Deep Green (Primary)** | `#1F7A4D` | `hsl(150, 59%, 30%)` | Buttons, headers, primary actions |
| ⚪ | **White** | `#FFFFFF` | `hsl(0, 0%, 100%)` | Backgrounds, card surfaces |
| 🟠 | **Accent Orange** | `#F4A261` | `hsl(30, 87%, 67%)` | Badges, highlights, CTAs |

### Extended Palette

| Color | Name | Hex | Usage |
|-------|------|-----|-------|
| 🟢 | Primary Foreground | `#FFFFFF` | Text on primary backgrounds |
| ⬛ | Foreground | `#1A1A1A` | Primary text |
| 🔘 | Muted | `#F4F4F5` | Muted backgrounds |
| 🔘 | Muted Foreground | `#71717A` | Secondary text |
| 🔘 | Border | `#E4E4E7` | Borders, dividers |
| 🔴 | Destructive | `#EF4444` | Error states, delete actions |
| 🟢 | Success | `#16A34A` | Success states |

### Typography
- **Display Font:** System default (SF Pro on iOS, Roboto on Android)
- **Body Font:** System default
- **Brand Name Rendering:** Always "Shop4Me" (capital S, 4, M)

### Logo
- Primary logo: `public/logo.png` (green background with white text)
- Favicon: `public/favicon.jpeg`

### Design Tokens (React Native)
```typescript
export const Colors = {
  primary: '#1F7A4D',
  primaryForeground: '#FFFFFF',
  accentOrange: '#F4A261',
  background: '#FFFFFF',
  foreground: '#1A1A1A',
  muted: '#F4F4F5',
  mutedForeground: '#71717A',
  border: '#E4E4E7',
  destructive: '#EF4444',
  success: '#16A34A',
  card: '#FFFFFF',
  cardForeground: '#1A1A1A',
};
```

### Spacing Scale
```typescript
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

### Border Radius
```typescript
export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
```

---

## 3. Supabase Connection

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://iutxschzfxgntniurrmj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHhzY2h6ZnhnbnRuaXVycm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc0NDEsImV4cCI6MjA4NTU2MzQ0MX0.6y9x-FEBKPM5GV3GncnaNTkrFKFylWS5AfrB0VTH9Y0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});
```

---

## 4. Authentication

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: { full_name: 'John Doe' }  // Stored in raw_user_meta_data
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword',
});
```

### Auto-Created on Signup (via `handle_new_user` trigger)
- `profiles` row (user_id, email, full_name from metadata)
- `user_roles` row (default role: `buyer`)
- `wallets` row (balance: 0.00)

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Get User Role
```typescript
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .single();
```

### Available Roles (Enum: `app_role`)
`buyer` | `agent` | `admin` | `rider`

---

## 5. Database Schema

### Core Tables

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (unique) | References auth user |
| email | text | Required |
| full_name | text | Nullable |
| phone | text | Nullable |
| avatar_url | text | Nullable |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

#### `user_roles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | References auth user |
| role | app_role | Default: 'buyer' |
| created_at | timestamptz | Default: now() |

#### `wallets`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (unique) | References auth user |
| balance | numeric | Default: 0.00 |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

#### `wallet_transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| wallet_id | uuid (FK) | References wallets.id |
| amount | numeric | Required |
| type | text | 'credit' or 'debit' |
| description | text | Nullable |
| reference | text | Nullable |
| created_at | timestamptz | Default: now() |

#### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Buyer who created order |
| agent_id | uuid | Assigned agent (nullable) |
| location_name | text | Store/market name |
| location_type | text | 'mall', 'market', etc. |
| status | order_status | See enum below |
| delivery_address_id | uuid (FK) | Nullable |
| estimated_total | numeric | Nullable |
| final_total | numeric | Nullable |
| delivery_fee | numeric | Nullable |
| service_fee | numeric | Nullable |
| notes | text | Nullable |
| timer_started_at | timestamptz | Nullable |
| estimated_minutes | integer | Nullable |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

**Order Status Enum (`order_status`):**
`pending` → `accepted` → `shopping` → `items_confirmed` → `payment_pending` → `paid` → `in_transit` → `delivered` | `cancelled`

#### `order_items`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| order_id | uuid (FK) | References orders.id |
| name | text | Item name |
| quantity | integer | Default: 1 |
| estimated_price | numeric | Nullable |
| actual_price | numeric | Set by agent |
| description | text | Nullable |
| photo_url | text | Nullable |
| status | text | Default: 'pending' |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

#### `delivery_addresses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Owner |
| label | text | Default: 'Home' |
| address_line1 | text | Required |
| address_line2 | text | Nullable |
| city | text | Required |
| state | text | Required |
| landmark | text | Nullable |
| is_default | boolean | Default: false |

#### `chat_messages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| order_id | uuid (FK) | Nullable (null = DM) |
| sender_id | uuid | Required |
| receiver_id | uuid | Nullable |
| content | text | Nullable |
| message_type | message_type | See enum below |
| metadata | jsonb | Shopping lists, invoices |
| photo_url | text | Nullable |
| is_read | boolean | Default: false |
| created_at | timestamptz | Default: now() |

**Message Type Enum (`message_type`):**
`text` | `shopping_list` | `invoice` | `invoice_response` | `photo` | `status_update` | `system`

#### `invoices`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| invoice_number | text | e.g. "S4M-INV-000042" |
| order_id | uuid (FK) | References orders.id |
| agent_id | uuid | Invoice creator |
| buyer_id | uuid | Invoice recipient |
| items | jsonb | `[{name, qty, price}]` |
| extra_items | jsonb | Additional items |
| subtotal | numeric | Sum of items |
| service_fee | numeric | Platform fee |
| delivery_fee | numeric | Delivery charge |
| discount | numeric | Applied discount |
| total | numeric | Final amount |
| status | text | 'sent', 'approved', 'paid' |
| notes | text | Nullable |
| pdf_url | text | Nullable |

#### `payments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Payer |
| order_id | uuid (FK) | Nullable |
| amount | numeric | Required |
| currency | text | Default: 'NGN' |
| status | text | Default: 'pending' |
| provider | text | Default: 'paystack' |
| provider_reference | text | Paystack reference |
| payment_method | text | 'wallet', 'card' |
| provider_response | jsonb | Full response |

#### `agent_applications`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Applicant (nullable) |
| full_name | text | Required |
| email | text | Required |
| phone | text | Required |
| date_of_birth | date | Required |
| gender | text | Nullable |
| address | text | Required |
| city | text | Required |
| state | text | Required |
| lga | text | Nullable |
| id_type | text | NIN, Voter's card, etc. |
| id_number | text | Required |
| id_document_url | text | Nullable |
| photo_url | text | Nullable |
| bank_name | text | Required |
| account_number | text | Required |
| account_name | text | Required |
| role_type | text | Default: 'shopping_agent' |
| has_smartphone | boolean | Default: true |
| has_vehicle | boolean | Default: false |
| vehicle_type | text | Nullable |
| market_knowledge | text[] | Array of market names |
| experience_description | text | Nullable |
| status | application_status | See enum |
| admin_notes | text | Nullable |
| rejection_reason | text | Nullable |

**Application Status Enum:** `pending` | `under_review` | `approved` | `rejected` | `suspended`

#### `agent_locations` (Live Tracking)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| agent_id | uuid | The agent |
| order_id | uuid (FK) | Active order |
| latitude | numeric | Required |
| longitude | numeric | Required |
| accuracy | numeric | GPS accuracy in meters |
| heading | numeric | Direction in degrees |
| speed | numeric | Speed in m/s |
| proximity_notified | boolean | Default: false |
| updated_at | timestamptz | Auto-updated |

#### `agent_reviews`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| order_id | uuid (FK, unique) | One review per order |
| agent_id | uuid | Reviewed agent |
| buyer_id | uuid | Reviewer |
| rating | integer | 1–5 |
| review_text | text | Nullable |

#### `agent_earnings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| agent_id | uuid | The agent |
| order_id | uuid (FK) | Nullable |
| amount | numeric | Default: 0 |
| type | text | Earning type |
| status | text | Default: 'pending' |
| paid_at | timestamptz | Nullable |

#### `rider_alerts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| order_id | uuid (FK) | The order |
| agent_id | uuid | Who packed it |
| rider_id | uuid | Assigned rider (nullable) |
| store_location_name | text | Pickup location |
| store_latitude | numeric | Nullable |
| store_longitude | numeric | Nullable |
| order_packed | boolean | Default: false |
| status | text | Default: 'pending' |
| rider_arrived_at | timestamptz | Nullable |
| order_picked_up_at | timestamptz | Nullable |

#### `delivery_updates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| order_id | uuid (FK) | The order |
| agent_id | uuid | The agent |
| update_type | text | Status update type |
| message | text | Nullable |
| latitude | numeric | Nullable |
| longitude | numeric | Nullable |

#### `payment_cards`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Card owner |
| last4 | text | Last 4 digits |
| card_type | text | 'visa', 'mastercard' |
| brand | text | Nullable |
| bank | text | Nullable |
| exp_month | text | Expiry month |
| exp_year | text | Expiry year |
| authorization_code | text | Paystack auth code |
| is_default | boolean | Default: false |
| nickname | text | Nullable |

#### `expo_push_tokens` ✨ NEW
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Token owner |
| token | text | Expo push token |
| device_name | text | Nullable |
| platform | text | 'ios', 'android', 'unknown' |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |
| **Unique Constraint** | | (user_id, token) |

#### Other Tables
- `push_subscriptions` — Web Push (browser only)
- `blog_posts` — CMS content
- `newsletter_subscriptions` — Email list
- `contact_submissions` — Contact form entries
- `compliance_actions` — Admin compliance log
- `admin_announcements` — Admin broadcast messages
- `platform_settings` — Key/value config (public read)

---

## 6. Edge Functions (API Endpoints)

**Base URL:** `https://iutxschzfxgntniurrmj.supabase.co/functions/v1/`

All functions accept POST with JSON body. Include auth header:
```
Authorization: Bearer <user_jwt>
```

### 6.1 `paystack-initialize`
Initialize a Paystack payment session.

**Request:**
```json
{
  "orderId": "uuid",
  "amount": 5000,
  "email": "user@example.com",
  "callbackUrl": "shop4me://payment-callback"
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "access_code": "...",
  "reference": "...",
  "payment_id": "uuid"
}
```

### 6.2 `paystack-verify`
Verify a payment after callback.

**Request:**
```json
{
  "reference": "paystack_reference_string"
}
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "amount": 5000,
  "payment_method": "card"
}
```

### 6.3 `paystack-wallet-topup`
Top up wallet balance via Paystack.

**Request:**
```json
{
  "amount": 10000,
  "email": "user@example.com",
  "callbackUrl": "shop4me://wallet-topup-callback"
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "..."
}
```

### 6.4 `paystack-charge-card`
Charge a saved card (uses authorization_code).

**Request:**
```json
{
  "amount": 5000,
  "email": "user@example.com",
  "authorization_code": "AUTH_xxxx",
  "orderId": "uuid"
}
```

### 6.5 `pay-with-wallet`
Debit user wallet for an order.

**Request:**
```json
{
  "orderId": "uuid",
  "amount": 5000
}
```

**Response:**
```json
{
  "success": true,
  "new_balance": 15000,
  "transaction_id": "uuid"
}
```

### 6.6 `paystack-webhook`
**Paystack server-to-server webhook.** Not called from app directly.
- URL: `https://iutxschzfxgntniurrmj.supabase.co/functions/v1/paystack-webhook`
- Validates HMAC-SHA512 signature using `PAYSTACK_SECRET_KEY`
- Updates payment status, wallet balance, order status

### 6.7 `send-push-notification`
Send push to specific user or broadcast by role. Supports **both Web Push and Expo Push**.

**Request:**
```json
{
  "userId": "uuid",
  "title": "Order Accepted!",
  "body": "Your agent is heading to the store.",
  "url": "/dashboard/orders/uuid",
  "data": { "orderId": "uuid", "screen": "OrderDetail" }
}
```

**Broadcast by role:**
```json
{
  "role": "rider",
  "title": "New Pickup Available",
  "body": "Order ready at Computer Village, Ikeja",
  "data": { "alertId": "uuid", "screen": "AvailablePickups" }
}
```

### 6.8 `send-notification-email`
Send branded transactional emails via Resend.

**Request:**
```json
{
  "to": "user@example.com",
  "subject": "Your order is on the way!",
  "userName": "John",
  "body": "Your agent has completed shopping.",
  "ctaText": "Track Order",
  "ctaUrl": "https://www.shop4meng.com/dashboard/orders/uuid"
}
```

### 6.9 `send-invoice-email`
Send an invoice email with breakdown.

**Request:**
```json
{
  "to": "buyer@example.com",
  "invoiceNumber": "S4M-INV-000042",
  "buyerName": "John",
  "items": [{"name": "Rice 5kg", "qty": 2, "price": 4500}],
  "subtotal": 9000,
  "serviceFee": 500,
  "deliveryFee": 1000,
  "discount": 0,
  "total": 10500,
  "paymentUrl": "https://www.shop4meng.com/dashboard/orders/uuid"
}
```

---

## 7. Realtime Subscriptions

### Chat Messages (per order)
```typescript
supabase
  .channel(`order-chat-${orderId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `order_id=eq.${orderId}`,
  }, (payload) => { /* handle new message */ })
  .subscribe();
```

### Order Status Updates
```typescript
supabase
  .channel(`order-${orderId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`,
  }, (payload) => { /* handle status change */ })
  .subscribe();
```

### Wallet Balance
```typescript
supabase
  .channel(`wallet-${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'wallets',
    filter: `user_id=eq.${userId}`,
  }, (payload) => { /* update balance UI */ })
  .subscribe();
```

### Agent Location (Live Tracking)
```typescript
supabase
  .channel(`agent-location-${orderId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'agent_locations',
    filter: `order_id=eq.${orderId}`,
  }, (payload) => { /* update map marker */ })
  .subscribe();
```

### Rider Alerts (for riders)
```typescript
supabase
  .channel('rider-alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'rider_alerts',
  }, (payload) => { /* new pickup available */ })
  .subscribe();
```

---

## 8. Storage Buckets

| Bucket | Public | Usage |
|--------|--------|-------|
| `avatars` | ✅ Yes | User profile photos |
| `chat-photos` | ✅ Yes | Photos sent in chat |
| `blog-images` | ✅ Yes | Blog post cover images |
| `agent-documents` | ❌ No | ID documents, private uploads |

### Upload Example
```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    contentType: 'image/jpeg',
    upsert: true,
  });

const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`);
```

---

## 9. Push Notifications (Expo)

### Register Token
```typescript
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

async function registerForPushNotifications(userId: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })).data;

  // Upsert to expo_push_tokens table
  await supabase.from('expo_push_tokens').upsert({
    user_id: userId,
    token,
    platform: Platform.OS,  // 'ios' or 'android'
    device_name: Constants.deviceName || 'Unknown',
  }, { onConflict: 'user_id,token' });
}
```

### Unregister Token
```typescript
async function unregisterPushToken(userId: string, token: string) {
  await supabase
    .from('expo_push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
}
```

### How It Works
The `send-push-notification` edge function automatically:
1. Queries `push_subscriptions` (web) AND `expo_push_tokens` (mobile)
2. Sends to both channels simultaneously
3. Auto-cleans expired/invalid tokens (DeviceNotRegistered)
4. Batches Expo messages (100 per API call)

---

## 10. Deep Linking & Payment Callbacks

### URL Scheme
```
shop4me://
```

### Expo Deep Link Configuration

**app.json:**
```json
{
  "expo": {
    "scheme": "shop4me",
    "ios": {
      "bundleIdentifier": "com.shop4me.app",
      "associatedDomains": ["applinks:www.shop4meng.com"]
    },
    "android": {
      "package": "com.shop4me.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            { "scheme": "shop4me" },
            { "scheme": "https", "host": "www.shop4meng.com", "pathPrefix": "/app" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Deep Link Routes

| Route | URL | Purpose |
|-------|-----|---------|
| Home | `shop4me://home` | Main dashboard |
| Order Detail | `shop4me://orders/{orderId}` | View specific order |
| Payment Callback | `shop4me://payment-callback?reference={ref}` | After Paystack payment |
| Wallet Topup | `shop4me://wallet-topup-callback?reference={ref}` | After wallet topup |
| Chat | `shop4me://chat/{orderId}` | Order chat screen |
| New Order | `shop4me://new-order` | Create order flow |

### Payment Flow (Mobile)

```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

async function payWithPaystack(orderId: string, amount: number, email: string) {
  // 1. Initialize payment with mobile callback URL
  const { data } = await supabase.functions.invoke('paystack-initialize', {
    body: {
      orderId,
      amount,
      email,
      callbackUrl: 'shop4me://payment-callback',
    },
  });

  if (data?.authorization_url) {
    // 2. Open Paystack in in-app browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.authorization_url,
      'shop4me://payment-callback'
    );

    if (result.type === 'success' && result.url) {
      // 3. Extract reference from callback URL
      const url = Linking.parse(result.url);
      const reference = url.queryParams?.reference;

      if (reference) {
        // 4. Verify payment
        const verification = await supabase.functions.invoke('paystack-verify', {
          body: { reference },
        });
        return verification.data;
      }
    }
  }
}
```

### Deep Link Handler
```typescript
import * as Linking from 'expo-linking';

function useDeepLinkHandler(navigation) {
  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      const parsed = Linking.parse(url);
      
      switch (parsed.path) {
        case 'orders':
          navigation.navigate('OrderDetail', { orderId: parsed.queryParams.id });
          break;
        case 'payment-callback':
          handlePaymentCallback(parsed.queryParams.reference);
          break;
        case 'wallet-topup-callback':
          handleWalletTopupCallback(parsed.queryParams.reference);
          break;
        case 'chat':
          navigation.navigate('Chat', { orderId: parsed.queryParams.id });
          break;
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [navigation]);
}
```

---

## 11. Role-Based Navigation

### Buyer Screens
| Screen | Description |
|--------|-------------|
| Dashboard | Active orders overview, wallet balance |
| New Order | Select store → add items → choose address |
| Orders | List of all orders |
| Order Detail | Status, chat, live tracking, invoice, payment |
| Wallet | Balance, topup, transactions, saved cards |
| Messages | Chat threads |
| Addresses | Manage delivery addresses |
| Settings | Profile, notifications, account |

### Agent Screens
| Screen | Description |
|--------|-------------|
| Dashboard | Stats, active orders, earnings summary |
| Available Orders | Browse & accept pending orders |
| My Orders | Assigned orders |
| Order Detail | Shopping checklist, status updates, chat, invoice |
| Earnings | Earnings history |
| Messages | Chat threads |
| Settings | Profile, bank details, availability |

### Rider Screens
| Screen | Description |
|--------|-------------|
| Dashboard | Active deliveries stats |
| Available Pickups | Rider alerts for packed orders |
| My Deliveries | Assigned deliveries |
| Settings | Profile, vehicle info |

### Admin Screens (Optional in mobile)
| Screen | Description |
|--------|-------------|
| Dashboard | Platform stats |
| Users | Manage all users |
| Orders | All orders |
| Agents/Riders | Manage agents & riders |
| Applications | Review applications |
| Payments | Payment records |
| Settings | Platform settings |

---

## 12. Master Prompt for AI Code Generation

```
You are building a React Native mobile app using Expo for "Shop4Me", a personal shopping
and delivery platform operating in Nigeria. The app must share the SAME Supabase backend
as the existing web application.

## CRITICAL REQUIREMENTS

1. **Supabase Connection**: Use the existing Supabase project:
   - URL: https://iutxschzfxgntniurrmj.supabase.co
   - Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHhzY2h6ZnhnbnRuaXVycm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc0NDEsImV4cCI6MjA4NTU2MzQ0MX0.6y9x-FEBKPM5GV3GncnaNTkrFKFylWS5AfrB0VTH9Y0
   - Use AsyncStorage for session persistence
   - Set detectSessionInUrl: false

2. **Authentication**: Email/password auth via supabase.auth.signUp/signInWithPassword.
   On signup, pass full_name in options.data. The backend auto-creates profile, wallet,
   and buyer role.

3. **Role-Based Navigation**: After login, query user_roles table to determine role
   (buyer/agent/rider/admin) and navigate to appropriate stack.

4. **Branding**: Primary green #1F7A4D, accent orange #F4A261, white backgrounds.
   Brand name is "Shop4Me". Use system fonts.

5. **Payments**: Call edge functions (paystack-initialize) with callbackUrl: "shop4me://payment-callback".
   Open authorization_url with expo-web-browser's openAuthSessionAsync. Extract reference
   from callback URL and verify with paystack-verify edge function.

6. **Push Notifications**: Use expo-notifications to get Expo push token. Store in
   expo_push_tokens table (upsert on user_id+token). The backend edge function
   send-push-notification already handles both web and Expo tokens.

7. **Deep Linking**: URL scheme is "shop4me://". Handle routes: home, orders/{id},
   payment-callback, wallet-topup-callback, chat/{orderId}, new-order.

8. **Realtime**: Subscribe to postgres_changes for chat_messages (per order),
   orders (status updates), wallets (balance changes), agent_locations (live tracking).

9. **Maps**: Use react-native-maps for agent location tracking on order detail screen.

10. **Chat**: Support message types: text, shopping_list, invoice, invoice_response,
    photo, status_update, system. Metadata stored as JSONB.

11. **Currency**: Always format as NGN (Nigerian Naira) using Intl.NumberFormat('en-NG').

12. **DO NOT** create new backend tables, edge functions, or modify the existing
    Supabase configuration. Use only the existing API as documented.

## TECH STACK
- Expo SDK (latest)
- React Navigation (native stack + bottom tabs)
- @supabase/supabase-js with @react-native-async-storage/async-storage
- expo-notifications (push)
- expo-web-browser (Paystack payments)
- expo-linking (deep links)
- react-native-maps (tracking)
- expo-image-picker (chat photos, avatars)
- expo-location (agent location sharing)

## ORDER FLOW
Buyer creates order → Agent accepts → Agent shops → Agent sends shopping list →
Buyer confirms items → Agent sends invoice → Buyer pays (wallet or Paystack) →
Agent packs → Rider picks up → Rider delivers → Buyer rates agent

## DATABASE
Refer to the full schema documentation. All tables have RLS enabled.
Key tables: profiles, user_roles, wallets, orders, order_items, chat_messages,
invoices, payments, delivery_addresses, agent_locations, rider_alerts,
expo_push_tokens, agent_reviews, agent_earnings.

## EDGE FUNCTIONS (POST to https://iutxschzfxgntniurrmj.supabase.co/functions/v1/)
- paystack-initialize: {orderId, amount, email, callbackUrl}
- paystack-verify: {reference}
- paystack-wallet-topup: {amount, email, callbackUrl}
- paystack-charge-card: {amount, email, authorization_code, orderId}
- pay-with-wallet: {orderId, amount}
- send-push-notification: {userId|role, title, body, url?, data?}
- send-notification-email: {to, subject, userName, body, ctaText?, ctaUrl?}
- send-invoice-email: {to, invoiceNumber, buyerName, items, subtotal, serviceFee, deliveryFee, discount, total, paymentUrl}
```

---

## Appendix: Database Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `has_role(user_id, role)` | Check if user has specific role | uuid, app_role |
| `update_wallet_balance(...)` | Atomic wallet credit/debit | user_id, amount, type, description?, reference? |
| `generate_invoice_number()` | Generate next invoice number | (none) |
| `delete_user_account(user_id)` | Delete user's own account data | uuid (must be auth.uid()) |

---

## 12. Shared Types Package

The project includes a **platform-agnostic TypeScript types package** at `shared/types/` that must be used by both the web app and React Native app to ensure type consistency.

### Location

```
shared/
└── types/
    ├── index.ts      ← All exported types, constants, enums
    ├── package.json   ← @shop4me/shared-types
    └── README.md
```

### Setup in React Native (Expo)

1. Copy or symlink the `shared/types/` directory into your Expo project root
2. Add path alias in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@shop4me/shared-types": ["./shared/types"]
    }
  }
}
```

3. Import types:

```ts
import type { Order, ChatMessage, UserProfile, AppRole } from "@shop4me/shared-types";
import { BRAND, DEEP_LINK_ROUTES, REALTIME_CHANNELS } from "@shop4me/shared-types";
```

### Available Exports

| Category | Types / Constants |
|----------|-------------------|
| **Enums** | `AppRole`, `OrderStatus`, `ApplicationStatus`, `MessageType`, `PaymentProvider`, `PaymentStatus`, `WalletTransactionType`, `InvoiceStatus` |
| **Auth** | `UserProfile`, `UserRole` |
| **Orders** | `Order`, `OrderItem` |
| **Chat** | `ChatMessage`, `ShoppingListItem`, `ShoppingListMetadata`, `InvoiceItem`, `InvoiceMetadata`, `InvoiceResponseMetadata` |
| **Invoices** | `Invoice`, `InvoiceLineItem` |
| **Wallet** | `Wallet`, `WalletTransaction`, `Payment`, `PaymentCard` |
| **Delivery** | `DeliveryAddress`, `AgentLocation`, `DeliveryUpdate` |
| **Agent** | `AgentApplication`, `AgentEarning`, `AgentReview` |
| **Rider** | `RiderAlert` |
| **Notifications** | `PushSubscription`, `ExpoPushToken` |
| **Content** | `BlogPost`, `NewsletterSubscription`, `ContactSubmission` |
| **Platform** | `PlatformSetting`, `ComplianceAction`, `AdminAnnouncement` |
| **Edge Function Payloads** | `PaystackInitializePayload`, `PaystackVerifyPayload`, `WalletTopupPayload`, `WalletPayPayload`, `ChargeCardPayload`, `SendPushPayload`, `SendEmailPayload`, `SendInvoiceEmailPayload` |
| **Constants** | `BRAND` (colors, fonts, storage buckets), `DEEP_LINK_ROUTES`, `REALTIME_CHANNELS` |

### Rules

- **No platform-specific imports** — no React, React Native, DOM, or Supabase client code
- **JSON-serializable** — all types must work over the wire
- **Single source of truth** — both apps import from here, never duplicate type definitions

### Branding Constants (from `BRAND`)

```ts
BRAND.colors.primaryGreen    // "#1F7A4D"
BRAND.colors.accentOrange    // "#F4A261"
BRAND.colors.backgroundLight // "#F9FAFB"
BRAND.colors.error           // "#EF4444"
BRAND.fonts.display          // "Playfair Display"
BRAND.fonts.body             // "Inter"
```

---

## 13. Shared Hooks Package

Located at `shared/hooks/`, these React hooks work on both web and React Native. Each hook accepts a `client: SupabaseClient` parameter so each platform provides its own configured client.

### Available Hooks

| Hook | Purpose | Realtime |
|------|---------|----------|
| `useOrders({ client, userId, role })` | Fetch buyer/agent orders | ✅ INSERT/UPDATE/DELETE |
| `useWallet({ client, userId })` | Balance, transactions, fund/pay/verify | ✅ Balance + transactions |
| `useOrderChat({ client, userId, orderId })` | Chat with send/upload/markRead | ✅ New messages |
| `useUserProfile({ client, userId })` | Profile + getSurname/getInitials/update | ❌ |
| `useUserRole({ client, userId })` | Role + isAgent/isAdmin/isBuyer/isRider | ❌ |
| `useNotifications({ client, userId })` | Web Push + Native Push (auto-detect) | ❌ |

### Setup in React Native

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@shop4me/shared-hooks": ["./shared/hooks"],
      "@shop4me/shared-types": ["./shared/types"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### Usage Example

```ts
import { supabase } from "./lib/supabase"; // AsyncStorage-backed client
import { useOrders, useWallet, useNotifications } from "@shop4me/shared-hooks";

// In a component:
const { orders, loading } = useOrders({ client: supabase, userId: user?.id, role: "buyer" });
const { wallet, fundWallet } = useWallet({ client: supabase, userId: user?.id });
```

### useNotifications Hook

The `useNotifications` hook automatically detects the platform and uses the appropriate push registration strategy:

- **Web**: Service Worker + Web Push API → stores subscription in `push_subscriptions` table
- **Native (Capacitor)**: Capacitor PushNotifications plugin → stores token in `expo_push_tokens` table

```ts
import { useNotifications } from "@shop4me/shared-hooks";

const {
  isSupported,   // boolean — whether push is available on this platform
  isSubscribed,  // boolean — whether the user is currently subscribed
  isLoading,     // boolean — loading state during subscribe/unsubscribe
  permission,    // string — current permission status
  channel,       // "web" | "native" | "none"
  subscribe,     // () => Promise<boolean> — request permission & register
  unsubscribe,   // () => Promise<boolean> — remove registration
} = useNotifications({
  client: supabase,
  userId: user?.id,
  onForegroundNotification: (title, body, data) => {
    // Native only: show in-app toast when notification received in foreground
  },
  onNotificationTapped: (data) => {
    // Native only: navigate to relevant screen when user taps notification
    if (data?.screen === "OrderDetail") navigation.navigate("OrderDetail", { id: data.orderId });
  },
});
```

---

## 14. Capacitor Native Plugins

The web app includes Capacitor plugins for hybrid mobile functionality. These are used via platform-aware wrapper hooks in `src/lib/native/` that gracefully no-op on web browsers.

### Installed Plugins

| Plugin | Package | Version | Purpose |
|--------|---------|---------|---------|
| Camera | `@capacitor/camera` | ^6.0.0 | Photo capture & gallery access |
| Push Notifications | `@capacitor/push-notifications` | — | Native push token registration |
| Haptics | `@capacitor/haptics` | ^8.0.1 | Tactile feedback on native devices |
| Share | `@capacitor/share` | ^8.0.1 | OS-level share sheet |
| App | `@capacitor/app` | ^8.0.1 | Deep link handling, app lifecycle |
| Status Bar | `@capacitor/status-bar` | ^8.0.1 | Status bar styling |
| Keyboard | `@capacitor/keyboard` | ^8.0.1 | Keyboard events & control |

### Platform-Aware Hooks (`src/lib/native/`)

| Hook | Import | Description |
|------|--------|-------------|
| `useNativeCamera()` | `@/lib/native` | `takePhoto()` and `pickFromGallery()` with permission handling. Returns base64 data URI. |
| `useNativePush()` | `@/lib/native` | Registers device for push, auto-upserts token to `expo_push_tokens`. |
| `useHaptics()` | `@/lib/native` | `impact(style)`, `notification(type)`, `selectionChanged()`, `vibrate(duration)`. |
| `useNativeShare()` | `@/lib/native` | `share({ title, text, url })` — falls back to Web Share API or clipboard. |
| `useDeepLinks()` | `@/lib/native` | Listens for `shop4me://` URLs via `@capacitor/app`. |
| `isNativePlatform()` | `@/lib/native` | Utility: returns `true` when running inside Capacitor shell. |

### useNativeCamera Usage

```tsx
import { useNativeCamera } from "@/lib/native";

const { takePhoto, pickFromGallery, isAvailable } = useNativeCamera();

// On native: opens device camera; on web: no-op (use file input instead)
const photo = await takePhoto(); // returns base64 data URI or null

// On native: opens photo gallery
const picked = await pickFromGallery(); // returns base64 data URI or null
```

**Integrated in:**
- `ChatInput.tsx` — photo sending in order chat (dropdown: Take Photo / Choose from Gallery)
- `PhotoUploadSection.tsx` — agent document/photo uploads during application

### useNativeShare Usage

```tsx
import { useNativeShare } from "@/lib/native";

const { share, isAvailable } = useNativeShare();

await share({
  title: "Check out Shop4Me!",
  text: "Personal shopping made easy",
  url: "https://www.shop4meng.com",
});
```

### useDeepLinks Usage

```tsx
import { useDeepLinks } from "@/lib/native";

// In your root App component:
useDeepLinks(); // Automatically listens for shop4me:// URLs
```

---

## 15. Haptic Feedback Integration

The `useHaptics` hook from `src/lib/native/useHaptics.ts` provides tactile feedback on native devices. All methods are no-ops on web browsers.

### API

```tsx
import { useHaptics } from "@/lib/native";

const { impact, notification, selectionChanged, vibrate, isAvailable } = useHaptics();

// Impact feedback (button presses, UI interactions)
await impact("light");   // subtle tap
await impact("medium");  // standard tap
await impact("heavy");   // strong tap

// Notification feedback (success/error states)
await notification("success"); // success pattern
await notification("warning"); // warning pattern
await notification("error");   // error pattern

// Selection change (picker scrolling, toggle switches)
await selectionChanged();

// Custom vibration
await vibrate(300); // 300ms vibration
```

### Where Haptics Are Integrated

| Component / Page | Trigger | Haptic Type |
|-----------------|---------|-------------|
| `WalletFundedAnimation` | Wallet top-up success overlay | `notification("success")` + `impact("heavy")` |
| `DeliveryStatusUpdater` | Agent sends delivery update | `impact("medium")` on press, `notification("success"/"error")` on result |
| `AgentOrderDetail` | Status change (Start Shopping, Start Delivery, Mark Delivered) | `impact("medium")` on press, `notification("success"/"error")` on result |
| `AvailableOrders` (Agent) | Accept Order button | `impact("heavy")` on press, `notification("success"/"error")` on result |
| `AvailablePickups` (Rider) | Accept Pickup button | `impact("heavy")` on press, `notification("success"/"error")` on result |
| `AvailablePickups` (Rider) | Mark Arrived / Order Picked Up | `impact("medium")` on press, `notification("success")` on result |
| `AvailablePickups` (Rider) | Mark Delivered button | `impact("heavy")` on press, `notification("success")` on result |

### Pattern Guidelines

When adding haptics to new features, follow these conventions:

| Action Type | Recommended Haptic |
|------------|-------------------|
| Primary action button press | `impact("heavy")` |
| Secondary action button press | `impact("medium")` |
| Successful operation | `notification("success")` |
| Failed operation | `notification("error")` |
| Toggle/selection change | `selectionChanged()` |
| Destructive action confirmation | `notification("warning")` + `impact("heavy")` |

---

## 16. Master Prompt for AI Code Generation

```
You are building a React Native mobile app using Expo for "Shop4Me", a personal shopping
and delivery platform operating in Nigeria. The app must share the SAME Supabase backend
as the existing web application.

## CRITICAL REQUIREMENTS

1. **Supabase Connection**: Use the existing Supabase project:
   - URL: https://iutxschzfxgntniurrmj.supabase.co
   - Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHhzY2h6ZnhnbnRuaXVycm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc0NDEsImV4cCI6MjA4NTU2MzQ0MX0.6y9x-FEBKPM5GV3GncnaNTkrFKFylWS5AfrB0VTH9Y0
   - Use AsyncStorage for session persistence
   - Set detectSessionInUrl: false

2. **Authentication**: Email/password auth via supabase.auth.signUp/signInWithPassword.
   On signup, pass full_name in options.data. The backend auto-creates profile, wallet,
   and buyer role.

3. **Role-Based Navigation**: After login, query user_roles table to determine role
   (buyer/agent/rider/admin) and navigate to appropriate stack.

4. **Branding**: Primary green #1F7A4D, accent orange #F4A261, white backgrounds.
   Brand name is "Shop4Me". Use system fonts.

5. **Payments**: Call edge functions (paystack-initialize) with callbackUrl: "shop4me://payment-callback".
   Open authorization_url with expo-web-browser's openAuthSessionAsync. Extract reference
   from callback URL and verify with paystack-verify edge function.

6. **Push Notifications**: Use the shared useNotifications hook from shared/hooks/ which
   auto-detects the platform. On native it uses Capacitor PushNotifications and stores
   tokens in expo_push_tokens. On web it uses Web Push API and stores in push_subscriptions.
   The backend edge function send-push-notification handles both channels.

7. **Deep Linking**: URL scheme is "shop4me://". Handle routes: home, orders/{id},
   payment-callback, wallet-topup-callback, chat/{orderId}, new-order.

8. **Realtime**: Subscribe to postgres_changes for chat_messages (per order),
   orders (status updates), wallets (balance changes), agent_locations (live tracking).

9. **Maps**: Use react-native-maps for agent location tracking on order detail screen.

10. **Chat**: Support message types: text, shopping_list, invoice, invoice_response,
    photo, status_update, system. Metadata stored as JSONB.

11. **Currency**: Always format as NGN (Nigerian Naira) using Intl.NumberFormat('en-NG').

12. **Shared Code**: Use hooks from shared/hooks/ (useOrders, useWallet, useOrderChat,
    useUserProfile, useUserRole, useNotifications) for business logic. These accept a
    client: SupabaseClient parameter for dependency injection.

13. **Haptic Feedback**: Use impact("heavy") for primary actions, impact("medium") for
    secondary actions, notification("success"/"error") for operation results. Import
    from the native haptics utility. All methods no-op on web.

14. **DO NOT** create new backend tables, edge functions, or modify the existing
    Supabase configuration. Use only the existing API as documented.

## TECH STACK
- Expo SDK (latest)
- React Navigation (native stack + bottom tabs)
- @supabase/supabase-js with @react-native-async-storage/async-storage
- Shared hooks from shared/hooks/ (useOrders, useWallet, useNotifications, etc.)
- expo-notifications (push) — or shared useNotifications hook
- expo-web-browser (Paystack payments)
- expo-linking (deep links)
- react-native-maps (tracking)
- expo-image-picker (chat photos, avatars)
- expo-location (agent location sharing)
- expo-haptics (tactile feedback)

## ORDER FLOW
Buyer creates order → Agent accepts → Agent shops → Agent sends shopping list →
Buyer confirms items → Agent sends invoice → Buyer pays (wallet or Paystack) →
Agent packs → Rider picks up → Rider delivers → Buyer rates agent

## DATABASE
Refer to the full schema documentation. All tables have RLS enabled.
Key tables: profiles, user_roles, wallets, orders, order_items, chat_messages,
invoices, payments, delivery_addresses, agent_locations, rider_alerts,
expo_push_tokens, agent_reviews, agent_earnings.

## EDGE FUNCTIONS (POST to https://iutxschzfxgntniurrmj.supabase.co/functions/v1/)
- paystack-initialize: {orderId, amount, email, callbackUrl}
- paystack-verify: {reference}
- paystack-wallet-topup: {amount, email, callbackUrl}
- paystack-charge-card: {amount, email, authorization_code, orderId}
- pay-with-wallet: {orderId, amount}
- send-push-notification: {userId|role, title, body, url?, data?}
- send-notification-email: {to, subject, userName, body, ctaText?, ctaUrl?}
- send-invoice-email: {to, invoiceNumber, buyerName, items, subtotal, serviceFee, deliveryFee, discount, total, paymentUrl}
```

---

## Appendix: Database Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `has_role(user_id, role)` | Check if user has specific role | uuid, app_role |
| `update_wallet_balance(...)` | Atomic wallet credit/debit | user_id, amount, type, description?, reference? |
| `generate_invoice_number()` | Generate next invoice number | (none) |
| `delete_user_account(user_id)` | Delete user's own account data | uuid (must be auth.uid()) |

---

*This document is auto-generated from the Shop4Me web application codebase and Supabase configuration.*

---

## 17. Fee Engine (NEW — 2026-04-20)

**Single source of truth** for all order pricing across web + React Native.
Both clients MUST call the `calculate-order-fees` edge function before
displaying or persisting an invoice total. Never compute fees client-side
except for live preview.

### 17.1 New Tables

| Table | Purpose | Admin-managed |
|-------|---------|--------------|
| `service_fee_tiers` | Tiered % service fee on subtotal (10/7/5%) | ✅ |
| `delivery_fee_tiers` | Distance bands → flat delivery fee | ✅ |
| `zone_centroids` | GPS centroid per service zone (fallback when no buyer pin) | ✅ |

`platform_settings` keys added: `surge_active` (bool), `surge_multiplier` (num),
`heavy_order_surcharge` (num NGN), `minimum_delivery_fee` (num NGN).

`orders` table gained: `is_heavy_order` (bool), `surge_applied` (num).

### 17.2 Edge function: `calculate-order-fees`

`POST` to `${SUPABASE_URL}/functions/v1/calculate-order-fees` with the anon
key in `Authorization: Bearer <anon>`.

**Request:**
```json
{
  "subtotal": 12500,
  "store_lat": 4.8403, "store_lng": 7.0044,
  "delivery_lat": 4.8156, "delivery_lng": 7.0498,
  "buyer_zone": "choba",       // fallback when no pin
  "store_zone": "rumuola",     // fallback when no store GPS
  "is_heavy_order": false
}
```

**Response:**
```json
{
  "subtotal": 12500,
  "service_fee": 1250,
  "service_fee_percentage": 10,
  "delivery_fee": 2500,
  "base_delivery_fee": 2500,
  "distance_km": 5.4,
  "surge_active": false,
  "surge_multiplier": 1,
  "heavy_surcharge": 0,
  "minimum_delivery_fee": 1000,
  "total": 16250
}
```

### 17.3 Calculation rules (mirror these for offline preview)

1. **Service fee**: pick the tier where `min_subtotal ≤ subtotal ≤ max_subtotal`,
   then `service_fee = round(subtotal × percentage / 100)`.
2. **Delivery fee**:
   - If both store and buyer GPS are present → haversine km → pick tier.
   - Else fall back to zone centroid lookup, then haversine.
   - If still nothing → use the smallest tier as a safety net.
3. **Surge**: if `surge_active`, `delivery_fee = round(delivery_fee × surge_multiplier)`.
4. **Heavy**: if `is_heavy_order`, add `heavy_order_surcharge`.
5. **Floor**: `delivery_fee = max(delivery_fee, minimum_delivery_fee)`.
6. **Total**: `subtotal + service_fee + delivery_fee`.

### 17.4 React Native integration checklist

- [ ] Cache the four tables on app launch (`service_fee_tiers`, `delivery_fee_tiers`, `zone_centroids`, relevant `platform_settings` keys) with 5-minute TTL — used for instant preview.
- [ ] Always call `calculate-order-fees` immediately before any "Send Invoice" / "Pay" action — never trust the cached preview for the final number.
- [ ] When the buyer has no GPS pin, prompt aggressively to drop one. The zone-centroid fallback is a safety net, not the happy path.
- [ ] When agent toggles **Heavy / bulk order**, persist `orders.is_heavy_order = true` and re-quote.
- [ ] Show a `Surge` badge next to the delivery fee whenever `surge_active` is true.

### 17.5 What agents/riders can NO LONGER do

- Agents cannot edit `service_fee`, `delivery_fee`, or `discount` fields. The only fee-related toggle is the **Heavy / bulk order** switch on the invoice form.
- Riders never see or set fees; they receive payouts based on the locked-in delivery fee.
- All fee config is admin-only via `/admin/settings`.

