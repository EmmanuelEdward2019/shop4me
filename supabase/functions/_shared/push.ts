import webpush from "https://esm.sh/web-push@3.6.7";

// Shared sender for admin announcements and engagement nudges: web push +
// Expo (mobile). Records WHY each device failed and removes subscriptions that
// can never succeed, so "failed" counts mean something.

// deno-lint-ignore no-explicit-any
type Sb = any;

export interface PushMessage {
  title: string;
  body: string;
  webUrl: string;
  appUrl: string;
  data?: Record<string, string>;
}

export interface PushResult {
  webSent: number;
  expoSent: number;
  failed: number;
  /** Dead subscriptions/tokens deleted during this send. */
  removed: number;
  /** Failure counts by reason, e.g. { web_key_mismatch: 2, expo_DeviceNotRegistered: 1 }. */
  reasons: Record<string, number>;
}

export type WebPushFailure = "gone" | "key_mismatch" | "rejected" | "network";

export function classifyWebPushError(err: unknown): WebPushFailure {
  const code = (err as { statusCode?: number })?.statusCode;
  if (code === 404 || code === 410) return "gone"; // browser unsubscribed / expired
  if (code === 401 || code === 403) return "key_mismatch"; // created with a different VAPID key
  if (!code) return "network";
  return "rejected";
}

export async function sendPush(supabase: Sb, userIds: string[], msg: PushMessage): Promise<PushResult> {
  const r: PushResult = { webSent: 0, expoSent: 0, failed: 0, removed: 0, reasons: {} };
  const bump = (reason: string) => {
    r.reasons[reason] = (r.reasons[reason] ?? 0) + 1;
    r.failed++;
  };

  const vapidPub = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY");
  const webEnabled = !!(vapidPub && vapidPriv);
  if (webEnabled) webpush.setVapidDetails("mailto:support@shop4meng.com", vapidPub!, vapidPriv!);

  // Key-mismatch subscriptions are only deleted once this same send has proven
  // the server key is valid (at least one browser accepted it) — a misconfigured
  // secret must never wipe everyone's subscriptions.
  const keyMismatchIds: string[] = [];

  for (let i = 0; i < userIds.length; i += 500) {
    const chunk = userIds.slice(i, i + 500);

    if (webEnabled) {
      const { data: subs } = await supabase.from("push_subscriptions")
        .select("id, endpoint, p256dh, auth").in("user_id", chunk);
      const outcomes = await Promise.all(
        (subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: msg.title, body: msg.body, url: msg.webUrl, ...(msg.data ?? {}) }),
              { TTL: 60 * 60 * 24 },
            );
            return { id: s.id, ok: true as const };
          } catch (err) {
            const e = err as { statusCode?: number; body?: string; message?: string };
            console.warn("web push failed:", e?.statusCode ?? "no-status", String(e?.body ?? e?.message ?? "").slice(0, 160));
            return { id: s.id, ok: false as const, kind: classifyWebPushError(err) };
          }
        }),
      );
      const goneIds: string[] = [];
      for (const o of outcomes) {
        if (o.ok) {
          r.webSent++;
          continue;
        }
        bump(`web_${o.kind}`);
        if (o.kind === "gone") goneIds.push(o.id);
        if (o.kind === "key_mismatch") keyMismatchIds.push(o.id);
      }
      if (goneIds.length) {
        await supabase.from("push_subscriptions").delete().in("id", goneIds);
        r.removed += goneIds.length;
      }
    }

    const { data: tokens } = await supabase.from("expo_push_tokens").select("token").in("user_id", chunk);
    const messages = (tokens ?? []).map((t: { token: string }) => ({
      to: t.token, sound: "default", title: msg.title, body: msg.body,
      channelId: "default", priority: "default", data: { url: msg.appUrl, ...(msg.data ?? {}) },
    }));
    for (let j = 0; j < messages.length; j += 100) {
      const batch = messages.slice(j, j + 100);
      try {
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        const out = await res.json();
        const tickets: { status?: string; message?: string; details?: { error?: string } }[] = out?.data ?? [];
        if (!res.ok || !tickets.length) console.warn("Expo push request failed:", res.status, JSON.stringify(out).slice(0, 200));
        for (let k = 0; k < batch.length; k++) {
          const t = tickets[k];
          if (t?.status === "ok") {
            r.expoSent++;
            continue;
          }
          const reason = t?.details?.error ?? "error";
          console.warn("Expo push ticket error:", reason, t?.message ?? "");
          bump(`expo_${reason}`);
          if (reason === "DeviceNotRegistered") {
            await supabase.from("expo_push_tokens").delete().eq("token", batch[k].to);
            r.removed++;
          }
        }
      } catch (e) {
        console.error("Expo push batch failed:", e);
        for (let k = 0; k < batch.length; k++) bump("expo_network");
      }
    }
  }

  if (keyMismatchIds.length && r.webSent > 0) {
    await supabase.from("push_subscriptions").delete().in("id", keyMismatchIds);
    r.removed += keyMismatchIds.length;
  }
  return r;
}
