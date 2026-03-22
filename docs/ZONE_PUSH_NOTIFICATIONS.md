# Zone-Based Push Notifications

## How It Works

### Service Zones

Service zones are canonical area slugs (e.g., `mile3`, `gra`, `rumuokoro`) defined in `src/lib/service-zones.ts`. They map 1:1 to store areas in Port Harcourt.

**Valid zone slugs:** `mile1`, `mile3`, `dline`, `gra`, `rumuokoro`, `rumuola`, `adageorge`, `transamadi`, `peterodili`, `elemejunction`, `azikiwe`

### How `profiles.service_zone` Is Set

Admins assign an agent's service zone via the **Admin → Agents** page. The dropdown uses the canonical slug list from `SERVICE_ZONES`. An agent with no zone set (`NULL`) is a "floater" and only receives notifications for orders that also have no zone.

### How `orders.service_zone` Is Set

- **Web:** `NewOrder.tsx` derives it from the selected store's `area` field using `areaToZoneSlug()`.
- **Mobile:** The React Native app sets it from market metadata at checkout.

### Push Notification Filtering (`send-push-notification` Edge Function)

The function supports two input shapes:

1. **Database Webhook** (`{ type: "INSERT", table: "orders", record: {...} }`): Automatically triggered on new order inserts.
2. **Client invoke** (`{ role: "agent", title, body, data: { service_zone } }`): Legacy path from mobile/web.

**Filtering rules:**
- `order.service_zone` is set → only agents with matching `profiles.service_zone` are notified.
- `order.service_zone` is NULL → only "floater" agents (NULL `profiles.service_zone`) are notified.
- Rider notifications are unaffected by zone filtering.

### Setting Up the Database Webhook (Recommended)

In Supabase Dashboard → Database → Webhooks:

| Field | Value |
|-------|-------|
| Table | `orders` |
| Event | `INSERT` |
| URL | `https://iutxschzfxgntniurrmj.supabase.co/functions/v1/send-push-notification` |
| Headers | `Authorization: Bearer <SERVICE_ROLE_KEY>`, `Content-Type: application/json` |

Once the webhook is active and verified, the mobile app's redundant `supabase.functions.invoke('send-push-notification')` call after order creation can be removed to prevent duplicate pushes.
