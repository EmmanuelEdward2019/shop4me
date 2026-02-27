# @shop4me/shared-hooks

Platform-agnostic React hooks shared between the **web app** and **React Native app**.

## Key Design Decision

Every hook accepts a `client: SupabaseClient` parameter instead of importing one directly. This lets each platform provide its own configured client (e.g., web uses localStorage, mobile uses AsyncStorage).

## Usage

### Web App

```ts
import { supabase } from "@/integrations/supabase/client";
import { useOrders } from "@shared/hooks";

const { orders, loading } = useOrders({
  client: supabase,
  userId: user?.id,
  role: "buyer",
});
```

### React Native App

```ts
import { supabase } from "./lib/supabase"; // uses AsyncStorage
import { useWallet } from "@shop4me/shared-hooks";

const { wallet, transactions, fundWallet } = useWallet({
  client: supabase,
  userId: user?.id,
});
```

## Available Hooks

| Hook | Purpose | Realtime |
|------|---------|----------|
| `useOrders` | Fetch user/agent orders with filters | ✅ INSERT/UPDATE/DELETE |
| `useWallet` | Balance, transactions, fund/pay actions | ✅ Balance + new transactions |
| `useOrderChat` | Chat messages with send/upload/markRead | ✅ New messages |
| `useUserProfile` | Profile data with update method | ❌ |
| `useUserRole` | Role + computed booleans (isAgent, etc.) | ❌ |

## Setup in React Native

1. Copy or symlink `shared/hooks/` and `shared/types/` into your Expo project
2. Add path aliases in `tsconfig.json`:

```json
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
