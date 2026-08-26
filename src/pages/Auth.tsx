import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, ArrowLeft, Loader2, Phone } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { REF_CODE_KEY } from "@/components/dashboard/ReferEarnCard";
import { ReferralLanding } from "@/components/ReferralLanding";
import {
  checkLoginLockout,
  formatLockoutMessage,
  recordAuthEvent,
} from "@/lib/authAudit";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^[+]?[\d\s()-]{10,20}$/, "Enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

const RATE_LIMIT_KEYWORDS = ["rate limit", "over_email_send_rate_limit", "too many requests", "security purposes", "after"];

const isRateLimitError = (msg: string) =>
  RATE_LIMIT_KEYWORDS.some((k) => msg.toLowerCase().includes(k));

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showReset, setShowReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const { signIn, signUp, resetPassword, user, loading } = useAuth();
  const { role, loading: roleLoading, isAdmin, isAgent, isRider } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from;

  // Count down the rate-limit cooldown every second
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setTimeout(() => setRateLimitCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCooldown]);

  // Capture a referral code from an invite link (?ref=CODE) and open Sign Up.
  // It's applied to the new account once authenticated (after email verify) —
  // see ReferEarnCard, which reads REF_CODE_KEY on the buyer dashboard.
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) {
      try { localStorage.setItem(REF_CODE_KEY, ref.trim().toUpperCase()); } catch { /* ignore */ }
      setActiveTab("signup");
    }
  }, [location.search]);

  const getRoleDashboard = () => {
    if (from) return from;
    if (isAdmin) return "/admin";
    if (isAgent) return "/agent";
    if (isRider) return "/rider";
    return "/dashboard";
  };

  useEffect(() => {
    if (!loading && !roleLoading && user && role) {
      navigate(getRoleDashboard(), { replace: true });
    }
  }, [user, loading, roleLoading, role, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "", confirmPassword: "" },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);

    // Server-side lockout pre-check (Slice B). Fail-OPEN: if the
    // RPC errors for any reason, `lockout.locked` comes back false
    // and the login proceeds normally — a bug in the audit layer
    // can never block a real user.
    const lockout = await checkLoginLockout(data.email);
    if (lockout.locked) {
      setIsLoading(false);
      toast.error(formatLockoutMessage(lockout));
      // Observational record so admins can see the lockout itself
      // in the security tab (Slice D).
      recordAuthEvent({
        eventType: "signin_failed",
        email: data.email,
        metadata: { reason: "locked_out", retry_in_seconds: lockout.retryInSeconds },
      });
      return;
    }

    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      // Audit the failure (fail-safe). We log the email so the
      // server-side lockout check can count attempts.
      recordAuthEvent({
        eventType: "signin_failed",
        email: data.email,
        metadata: { reason: error.message },
      });

      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Please verify your email before logging in.");
      } else {
        toast.error(error.message);
      }
    } else {
      recordAuthEvent({ eventType: "signin_success", email: data.email });
      toast.success("Welcome back!");
      // Redirect will happen via useEffect when role loads
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    if (rateLimitCooldown > 0) return;
    setIsLoading(true);
    recordAuthEvent({ eventType: "signup_attempt", email: data.email });
    const { error } = await signUp(data.email, data.password, data.fullName, data.phone);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("User already registered")) {
        toast.error("This email is already registered. Try logging in instead.");
      } else if (isRateLimitError(error.message)) {
        setRateLimitCooldown(60);
        toast.error("Too many sign-up attempts. Please wait 1 minute before trying again.");
      } else {
        toast.error(error.message);
      }
    } else {
      recordAuthEvent({ eventType: "signup_success", email: data.email });
      toast.success("Account created! Please check your email to verify your account.");
      setActiveTab("login");
    }
  };

  const handleResetPassword = async (data: ResetFormData) => {
    if (rateLimitCooldown > 0) return;
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);

    if (error) {
      if (isRateLimitError(error.message)) {
        setRateLimitCooldown(60);
        toast.error("Too many attempts. Please wait 1 minute before trying again.");
      } else {
        toast.error(error.message);
      }
    } else {
      recordAuthEvent({ eventType: "password_reset_requested", email: data.email });
      toast.success("Password reset email sent! Please check your inbox.");
      setShowReset(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // A referral link opened on a phone → send them to the app store (not the web
  // sign-up), with the code shown so they can enter it at sign-up in the app.
  const refParam = new URLSearchParams(location.search).get("ref");
  const onMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (refParam && onMobile) {
    return <ReferralLanding code={refParam.trim().toUpperCase()} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/">
              <img src={logo} alt="Shop4Me" className="h-12" />
            </Link>
          </div>

          {showReset ? (
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle className="font-display">Reset Password</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a reset link
                </CardDescription>
              </CardHeader>
              <form onSubmit={resetForm.handleSubmit(handleResetPassword)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        {...resetForm.register("email")}
                      />
                    </div>
                    {resetForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {resetForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={isLoading || rateLimitCooldown > 0}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : rateLimitCooldown > 0 ? (
                      `Try again in ${rateLimitCooldown}s`
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowReset(false)}
                  >
                    Back to login
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card className="border-border shadow-soft">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            {...loginForm.register("email")}
                          />
                        </div>
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-destructive">
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...loginForm.register("password")}
                          />
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => setShowReset(true)}
                      >
                        Forgot password?
                      </button>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Log In"
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={signupForm.handleSubmit(handleSignup)}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            className="pl-10"
                            {...signupForm.register("fullName")}
                          />
                        </div>
                        {signupForm.formState.errors.fullName && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="0801 234 5678"
                            className="pl-10"
                            {...signupForm.register("phone")}
                          />
                        </div>
                        {signupForm.formState.errors.phone && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.phone.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            {...signupForm.register("email")}
                          />
                        </div>
                        {signupForm.formState.errors.email && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...signupForm.register("password")}
                          />
                        </div>
                        {signupForm.formState.errors.password && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-confirm"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...signupForm.register("confirmPassword")}
                          />
                        </div>
                        {signupForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button type="submit" className="w-full" disabled={isLoading || rateLimitCooldown > 0}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : rateLimitCooldown > 0 ? (
                          `Try again in ${rateLimitCooldown}s`
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        By signing up, you agree to our{" "}
                        <a href="#" className="text-primary hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                      </p>
                    </CardFooter>
                  </form>
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
