import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [serviceFeePercentage, setServiceFeePercentage] = useState(10);
  const [deliveryFee, setDeliveryFee] = useState(1500);

  const [toggles, setToggles] = useState({
    platformName: "Shop4Me",
    supportEmail: "support@shop4me.ng",
    enableNewSignups: true,
    enableAgentRegistration: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings" as any)
          .select("key, value")
          .in("key", ["default_service_fee", "default_delivery_fee"]);

        if (error) throw error;

        (data || []).forEach((row: any) => {
          const val = typeof row.value === "number" ? row.value : Number(row.value);
          if (row.key === "default_service_fee") setServiceFee(val);
          if (row.key === "default_delivery_fee") setDeliveryFee(val);
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveFees = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "default_service_fee", value: serviceFee, updated_by: user?.id },
        { key: "default_delivery_fee", value: deliveryFee, updated_by: user?.id },
      ];

      for (const u of updates) {
        const { error } = await supabase
          .from("platform_settings" as any)
          .update({ value: u.value, updated_at: new Date().toISOString(), updated_by: u.updated_by })
          .eq("key", u.key);
        if (error) throw error;
      }

      toast({
        title: "Fees Updated",
        description: `Service Fee: ₦${serviceFee.toLocaleString()}, Delivery Fee: ₦${deliveryFee.toLocaleString()}`,
      });
    } catch (err: any) {
      console.error("Error saving fees:", err);
      toast({ title: "Error", description: err.message || "Failed to save fees", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings.</p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={toggles.platformName}
                  onChange={(e) => setToggles({ ...toggles, platformName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={toggles.supportEmail}
                  onChange={(e) => setToggles({ ...toggles, supportEmail: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Settings — connected to DB */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Configuration</CardTitle>
            <CardDescription>
              Set default service and delivery fees. These fees are applied to all new orders and invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading current fees…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceFee">Default Service Fee (₦)</Label>
                    <Input
                      id="serviceFee"
                      type="number"
                      min="0"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(Number(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">Charged to buyers per order</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Default Delivery Fee (₦)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      min="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">Charged to buyers per delivery</p>
                  </div>
                </div>
                <Button onClick={handleSaveFees} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Fees
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
            <CardDescription>Enable or disable platform features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New User Signups</Label>
                <p className="text-sm text-muted-foreground">Allow new users to register</p>
              </div>
              <Switch
                checked={toggles.enableNewSignups}
                onCheckedChange={(checked) => setToggles({ ...toggles, enableNewSignups: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Agent Registration</Label>
                <p className="text-sm text-muted-foreground">Allow new agents to apply</p>
              </div>
              <Switch
                checked={toggles.enableAgentRegistration}
                onCheckedChange={(checked) => setToggles({ ...toggles, enableAgentRegistration: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable the platform for users
                </p>
              </div>
              <Switch
                checked={toggles.maintenanceMode}
                onCheckedChange={(checked) => setToggles({ ...toggles, maintenanceMode: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSettings;
