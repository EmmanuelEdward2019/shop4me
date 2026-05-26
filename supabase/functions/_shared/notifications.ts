// DO NOT IMPORT FROM EDGE FUNCTIONS.
//
// `supabase functions deploy <name>` does NOT bundle the
// `supabase/functions/_shared/` directory alongside the function it
// deploys, so any function importing `../_shared/notifications.ts`
// will fail at deploy time with:
//   "Failed to bundle the function (reason: Module not found …)"
//
// Edge functions that need these helpers inline a local copy.
// This file is the canonical reference; propagate any change here
// into each function file's "Inlined helpers" block.
//
// Edge functions that currently contain an inlined copy:
//   - pay-with-wallet/index.ts
//   - paystack-verify/index.ts
//   - paystack-webhook/index.ts

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface NotificationPayload {
  userId: string | null | undefined;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function createNotification(
  supabase: SupabaseClient,
  payload: NotificationPayload,
): Promise<void> {
  if (!payload.userId) return;
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      data: payload.data ?? null,
    });
    if (error) {
      console.error(`[notifications] insert failed for user=${payload.userId} type=${payload.type}:`, error);
    }
  } catch (e) {
    console.error(`[notifications] unexpected error for user=${payload.userId} type=${payload.type}:`, e);
  }
}

export async function createNotifications(
  supabase: SupabaseClient,
  payloads: NotificationPayload[],
): Promise<void> {
  await Promise.allSettled(payloads.map((p) => createNotification(supabase, p)));
}

export async function getAdminUserIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error) {
    console.error("[notifications] failed to fetch admins:", error);
    return [];
  }
  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}
