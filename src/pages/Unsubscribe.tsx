import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { SUPABASE_URL } from "@/lib/supabaseUrl";

type State =
  | { phase: "loading" }
  | { phase: "invalid"; message: string }
  | { phase: "ready"; email: string; subscribed: boolean; reason: string | null };

const call = async (token: string, action: string) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/email-unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
  return data as { email: string; subscribed: boolean; reason: string | null };
};

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ phase: "loading" });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    document.title = "Email preferences — Shop4Me";
    if (!token) {
      setState({ phase: "invalid", message: "This unsubscribe link is incomplete." });
      return;
    }
    call(token, "status")
      .then((d) => setState({ phase: "ready", ...d }))
      .catch((e) => setState({ phase: "invalid", message: e.message }));
  }, [token]);

  const act = async (action: "unsubscribe" | "resubscribe") => {
    setWorking(true);
    try {
      const d = await call(token, action);
      setState({ phase: "ready", ...d });
    } catch (e) {
      setState({ phase: "invalid", message: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        <Link to="/"><img src={logo} alt="Shop4Me" className="mx-auto mb-6 h-10 w-auto" /></Link>

        {state.phase === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}

        {state.phase === "invalid" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-bold">We couldn't open that link</h1>
            <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Need help? Email <a className="text-primary underline" href="mailto:Support@shop4meng.com">Support@shop4meng.com</a>
            </p>
          </>
        )}

        {state.phase === "ready" && state.subscribed && (
          <>
            <MailX className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 font-display text-xl font-bold">Unsubscribe from Shop4Me emails?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>{state.email}</strong> will stop receiving promotions and news. You'll still get essential emails about your orders and account.
            </p>
            <Button className="mt-6 w-full" onClick={() => act("unsubscribe")} disabled={working}>
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Unsubscribe
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/">Keep me subscribed</Link></Button>
          </>
        )}

        {state.phase === "ready" && !state.subscribed && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 font-display text-xl font-bold">You're unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>{state.email}</strong> won't receive marketing emails from Shop4Me anymore.
            </p>
            {state.reason === "unsubscribed" ? (
              <Button variant="outline" className="mt-6 w-full" onClick={() => act("resubscribe")} disabled={working}>
                {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Changed your mind? Resubscribe
              </Button>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                This address was paused because earlier emails bounced or were reported. Contact support to restore it.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
