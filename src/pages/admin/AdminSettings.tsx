import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const AdminSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    platformName: "Shop4Me",
    supportEmail: "support@shop4me.ng",
    serviceFeePercent: 5,
    minDeliveryFee: 500,
    maxDeliveryFee: 3000,
    enableNewSignups: true,
    enableAgentRegistration: true,
    maintenanceMode: false,
  });

  const handleSave = () => {
    // In a real app, this would save to the database
    toast({
      title: "Settings Saved",
      description: "Platform settings have been updated successfully.",
    });
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
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Configuration</CardTitle>
            <CardDescription>Set service and delivery fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceFee">Service Fee (%)</Label>
                <Input
                  id="serviceFee"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.serviceFeePercent}
                  onChange={(e) =>
                    setSettings({ ...settings, serviceFeePercent: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minDelivery">Min Delivery Fee (₦)</Label>
                <Input
                  id="minDelivery"
                  type="number"
                  min="0"
                  value={settings.minDeliveryFee}
                  onChange={(e) =>
                    setSettings({ ...settings, minDeliveryFee: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDelivery">Max Delivery Fee (₦)</Label>
                <Input
                  id="maxDelivery"
                  type="number"
                  min="0"
                  value={settings.maxDeliveryFee}
                  onChange={(e) =>
                    setSettings({ ...settings, maxDeliveryFee: Number(e.target.value) })
                  }
                />
              </div>
            </div>
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
                checked={settings.enableNewSignups}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableNewSignups: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Agent Registration</Label>
                <p className="text-sm text-muted-foreground">Allow new agents to apply</p>
              </div>
              <Switch
                checked={settings.enableAgentRegistration}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableAgentRegistration: checked })
                }
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
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            Save Settings
          </Button>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSettings;
