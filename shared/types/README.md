# @shop4me/shared-types

Platform-agnostic TypeScript types shared between the **web app** (React/Vite) and **mobile app** (React Native/Expo).

## Usage

### Web App (this repo)

```ts
import type { Order, ChatMessage } from "@/shared/types";
import { BRAND, DEEP_LINK_ROUTES } from "@/shared/types";
```

### React Native App

Copy or symlink `shared/types/` into your Expo project, then:

```ts
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@shop4me/shared-types": ["./shared/types"]
    }
  }
}
```

```ts
import type { Order, ChatMessage } from "@shop4me/shared-types";
import { BRAND, REALTIME_CHANNELS } from "@shop4me/shared-types";
```

## What's Included

| Category | Types |
|----------|-------|
| **Auth** | `AppRole`, `UserProfile`, `UserRole` |
| **Orders** | `Order`, `OrderItem`, `OrderStatus` |
| **Chat** | `ChatMessage`, `MessageType`, `ShoppingListMetadata`, `InvoiceMetadata`, `InvoiceResponseMetadata` |
| **Invoices** | `Invoice`, `InvoiceLineItem`, `InvoiceItem` |
| **Wallet** | `Wallet`, `WalletTransaction`, `Payment`, `PaymentCard` |
| **Delivery** | `DeliveryAddress`, `AgentLocation`, `DeliveryUpdate` |
| **Agent** | `AgentApplication`, `AgentEarning`, `AgentReview` |
| **Rider** | `RiderAlert` |
| **Notifications** | `PushSubscription`, `ExpoPushToken` |
| **Content** | `BlogPost`, `NewsletterSubscription`, `ContactSubmission` |
| **Platform** | `PlatformSetting`, `ComplianceAction`, `AdminAnnouncement` |
| **Edge Functions** | `PaystackInitializePayload`, `WalletTopupPayload`, `SendPushPayload`, etc. |
| **Constants** | `BRAND`, `DEEP_LINK_ROUTES`, `REALTIME_CHANNELS` |

## Rules

- **No platform-specific imports** — no React, React Native, DOM, or Supabase client
- **JSON-serializable** — all types must work over the wire
- **Single source of truth** — both apps import from here, never duplicate
