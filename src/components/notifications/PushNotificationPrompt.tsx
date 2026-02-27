import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications } from "@shared/hooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const PushNotificationPrompt = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, permission, subscribe } = useNotifications({
    client: supabase,
    userId: user?.id,
  });
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("push-prompt-dismissed");
    if (!wasDismissed && isSupported && !isSubscribed && permission === "default") {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    localStorage.setItem("push-prompt-dismissed", "true");
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
  };

  if (!showPrompt || dismissed || isSubscribed || !isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">
                Enable notifications
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Get notified when you receive new messages from agents or buyers.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEnable} disabled={isLoading}>
                  {isLoading ? "Enabling..." : "Enable"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Not now
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const NotificationToggle = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, channel, subscribe, unsubscribe } = useNotifications({
    client: supabase,
    userId: user?.id,
  });

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Push Notifications</p>
            <p className="text-sm text-muted-foreground">Not supported on this device</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="w-5 h-5 text-primary" />
        ) : (
          <BellOff className="w-5 h-5 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium text-foreground">Push Notifications</p>
          <p className="text-sm text-muted-foreground">
            {isSubscribed
              ? `Enabled via ${channel === "native" ? "device" : "browser"}`
              : "Disabled - enable to get alerts"}
          </p>
        </div>
      </div>
      <Button
        variant={isSubscribed ? "outline" : "default"}
        size="sm"
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
      >
        {isLoading ? "..." : isSubscribed ? "Disable" : "Enable"}
      </Button>
    </div>
  );
};
