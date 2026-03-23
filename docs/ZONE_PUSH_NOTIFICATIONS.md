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

## GPS-Based Order Routing (PostGIS)

### How It Works

The `get_available_orders_nearby(p_agent_id)` Postgres function uses PostGIS to filter pending orders by geographic proximity to the agent's registered service location.

**Data sources:**
- **Agent location:** `agent_applications.service_latitude`, `service_longitude`, `service_radius_km` (set during application)
- **Store location:** `stores.latitude`, `stores.longitude` (matched to orders via `location_name`)

**Filtering logic (priority order):**
1. If the agent has GPS coords + radius → use `ST_DWithin` to find orders at stores within `service_radius_km`
2. If a store has no GPS coords → fall back to `service_zone` matching
3. If the agent has no GPS coords → fall back to zone-only matching
4. Floater agents (no zone, no GPS) only see unzoned orders

**Frontend:** `AvailableOrders.tsx` calls `supabase.rpc('get_available_orders_nearby')` instead of querying all pending orders directly.
