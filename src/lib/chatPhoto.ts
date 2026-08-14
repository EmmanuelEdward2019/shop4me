import { supabase } from "@/integrations/supabase/client";

// Chat photos are rendered via short-lived SIGNED URLs derived from the stored
// value's path — never via the raw public URL. This keeps rendering working
// whether the `chat-photos` bucket is public (today) or private (after the
// coordinated web + mobile switch + bucket flip), with no change to what's
// stored on messages (so old rows and the RN client keep working).

const BUCKET = "chat-photos";
const EXPIRY_SECONDS = 60 * 60; // 1 hour

/** Extract the storage path from a stored value (a public URL or a bare path). */
export function chatPhotoPath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const marker = `/${BUCKET}/`;
  const idx = stored.indexOf(marker);
  if (idx >= 0) return stored.slice(idx + marker.length).split("?")[0];
  // Already a bare storage path (no scheme).
  if (!/^https?:\/\//i.test(stored)) return stored.replace(/^\/+/, "");
  return null;
}

/**
 * Resolve a signed, expiring URL for a stored chat photo. Falls back to the
 * stored value if the path can't be derived or signing fails (e.g. while the
 * bucket is still public) — so it never blocks image display.
 */
export async function chatPhotoSignedUrl(stored: string): Promise<string> {
  const path = chatPhotoPath(stored);
  if (!path) return stored;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, EXPIRY_SECONDS);
  if (error || !data?.signedUrl) return stored;
  return data.signedUrl;
}
