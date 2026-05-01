import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          // Check if account is suspended — sign out immediately if so
          supabase
            .from("profiles")
            .select("is_suspended, full_name")
            .eq("user_id", session.user.id)
            .single()
            .then(({ data }) => {
              if (data?.is_suspended) {
                supabase.auth.signOut();
                return;
              }
              // Sync full_name from auth metadata
              const name = session.user.user_metadata?.full_name;
              if (name) {
                supabase.from("profiles").update({ full_name: name }).eq("user_id", session.user.id).then(() => {});
              }
            });

          // Send welcome email on first login (after email confirmation)
          const name = session.user.user_metadata?.full_name;
          const isFirstLogin = session.user.last_sign_in_at === session.user.created_at ||
            (new Date(session.user.last_sign_in_at || "").getTime() - new Date(session.user.created_at || "").getTime()) < 60000;
          if (isFirstLogin) {
            supabase.functions
              .invoke("send-notification-email", {
                body: { type: "welcome", data: { email: session.user.email || "", name: name || "" } },
              })
              .catch((err) => console.error("Welcome email failed:", err));
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time watch: if admin suspends this user while logged in, sign out immediately
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-suspension-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.is_suspended) {
            supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = "https://shop4meng.com/auth";
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    // Profile full_name is synced on SIGNED_IN via onAuthStateChange (covers email confirmation flow)

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectTo = "https://shop4meng.com/auth/reset-password";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // Note: branded password reset email is now handled by the auth-send-email hook
    // No need to manually send via send-notification-email

    return { error: error as Error | null };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
