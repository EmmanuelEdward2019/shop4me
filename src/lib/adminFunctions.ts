import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function and surface the server's own error message.
 * supabase.functions.invoke wraps non-2xx responses in a generic error, which
 * hides useful messages like "Add a subject line".
 */
export async function callAdminFunction<T = Record<string, unknown>>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) message = payload.error;
      }
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  const maybeError = (data as { error?: string } | null)?.error;
  if (maybeError) throw new Error(maybeError);
  return data as T;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
