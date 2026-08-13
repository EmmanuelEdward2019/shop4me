import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Self-service "Delete Account" danger-zone row. Works for any role — it calls
 * the delete-my-account edge function, which deletes only the caller's own
 * account (id derived from their JWT), then signs out.
 */
export const DeleteAccountSection = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const email = user?.email ?? "";

  // Edge functions validate the token via GoTrue, which rejects an expired
  // access token even when the cached session still "works" for DB reads —
  // so refresh it first.
  const getFreshToken = async (): Promise<string | null> => {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session?.access_token) return refreshed.session.access_token;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const handleDelete = async () => {
    if (!email || confirm !== email) {
      toast.error("Please type your email correctly to confirm.");
      return;
    }
    setIsDeleting(true);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error("Your session expired — please sign in again to continue.");

      const { data, error } = await supabase.functions.invoke("delete-my-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error || !data?.success) {
        const fnError =
          (data as { error?: string } | null)?.error ||
          (error as { message?: string } | undefined)?.message;
        throw new Error(fnError || "Failed to delete account. Please try again.");
      }

      toast.success("Your account has been permanently deleted.");
      await signOut();
      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Delete account error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
      setConfirm("");
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-destructive">Delete Account</p>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and personal data
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="sm:w-auto">
            Delete Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <span className="block">
                  This action <strong>cannot be undone</strong>. It permanently deletes your
                  account and removes your personal data from our servers.
                </span>
                <span className="block">
                  Your order history is anonymized but retained for record-keeping.
                </span>
                <span className="block pt-1">
                  <Label htmlFor="confirm-delete-email" className="text-foreground">
                    Type <span className="font-mono font-bold">{email}</span> to confirm
                  </Label>
                  <Input
                    id="confirm-delete-email"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-2"
                    autoComplete="off"
                  />
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirm("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || confirm !== email}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountSection;
