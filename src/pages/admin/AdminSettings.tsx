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
import { Loader2, Plus, Trash2, Zap, PackageOpen, Shield } from "lucide-react";

interface ServiceTier {
  id?: string;
  min_subtotal: number;
  max_subtotal: number | null;
  percentage: number;
  display_order: number;
  is_active: boolean;
}
interface DeliveryTier {
  id?: string;
  min_km: number;
  max_km: number | null;
  fee: number;
  display_order: number;
  is_active: boolean;
}

const fmt = (n: number) => new Intl.NumberFormat("en-NG").format(n);

const AdminSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTier[]>([]);
  const [surgeActive, setSurgeActive] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.25);
  const [heavySurcharge, setHeavySurcharge] = useState(1000);
  const [minDeliveryFee, setMinDeliveryFee] = useState(1000);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, d, p] = await Promise.all([
          supabase.from("service_fee_tiers" as any).select("*").order("display_order"),
          supabase.from("delivery_fee_tiers" as any).select("*").order("display_order"),
          supabase
            .from("platform_settings")
            .select("key, value")
            .in("key", ["surge_active", "surge_multiplier", "heavy_order_surcharge", "minimum_delivery_fee"]),
        ]);
        setServiceTiers(((s.data ?? []) as any[]).map((r) => ({
          id: r.id,
          min_subtotal: Number(r.min_subtotal),
          max_subtotal: r.max_subtotal == null ? null : Number(r.max_subtotal),
          percentage: Number(r.percentage),
          display_order: r.display_order,
          is_active: r.is_active,
        })));
        setDeliveryTiers(((d.data ?? []) as any[]).map((r) => ({
          id: r.id,
          min_km: Number(r.min_km),
          max_km: r.max_km == null ? null : Number(r.max_km),
          fee: Number(r.fee),
          display_order: r.display_order,
          is_active: r.is_active,
        })));
        for (const row of (p.data ?? []) as any[]) {
          let v: any = row.value;
          if (typeof v === "string") { try { v = JSON.parse(v); } catch {} }
          if (row.key === "surge_active") setSurgeActive(!!v);
          if (row.key === "surge_multiplier") setSurgeMultiplier(Number(v) || 1.25);
          if (row.key === "heavy_order_surcharge") setHeavySurcharge(Number(v) || 1000);
          if (row.key === "minimum_delivery_fee") setMinDeliveryFee(Number(v) || 1000);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateSetting = async (key: string, value: any) => {
    return supabase
      .from("platform_settings")
      .update({ value, updated_at: new Date().toISOString(), updated_by: user?.id } as any)
      .eq("key", key);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Upsert tiers — replace approach: delete then insert (simpler + atomic enough for admin tool)
      await supabase.from("service_fee_tiers" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (serviceTiers.length) {
        await supabase.from("service_fee_tiers" as any).insert(
          serviceTiers.map((t, i) => ({ ...t, display_order: i + 1, id: undefined })),
        );
      }
      await supabase.from("delivery_fee_tiers" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (deliveryTiers.length) {
        await supabase.from("delivery_fee_tiers" as any).insert(
          deliveryTiers.map((t, i) => ({ ...t, display_order: i + 1, id: undefined })),
        );
      }
      await Promise.all([
        updateSetting("surge_active", surgeActive),
        updateSetting("surge_multiplier", surgeMultiplier),
        updateSetting("heavy_order_surcharge", heavySurcharge),
        updateSetting("minimum_delivery_fee", minDeliveryFee),
      ]);
      toast({ title: "Settings saved", description: "All fee rules are live." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message ?? "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Pricing & Fees</h1>
          <p className="text-muted-foreground">Tiered service fees, distance-based delivery fees, and profit-protection levers.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Service Fee Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Service Fee Tiers</CardTitle>
                <CardDescription>Percentage charged on items subtotal. Lower % for bigger baskets keeps premium customers happy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {serviceTiers.map((t, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">From (₦)</Label>
                      <Input type="number" value={t.min_subtotal}
                        onChange={(e) => setServiceTiers((p) => p.map((x, idx) => idx === i ? { ...x, min_subtotal: Number(e.target.value) || 0 } : x))} />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">To (₦, blank = ∞)</Label>
                      <Input type="number" value={t.max_subtotal ?? ""}
                        onChange={(e) => setServiceTiers((p) => p.map((x, idx) => idx === i ? { ...x, max_subtotal: e.target.value === "" ? null : Number(e.target.value) } : x))} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">% Fee</Label>
                      <Input type="number" step="0.5" value={t.percentage}
                        onChange={(e) => setServiceTiers((p) => p.map((x, idx) => idx === i ? { ...x, percentage: Number(e.target.value) || 0 } : x))} />
                    </div>
                    <Button variant="ghost" size="icon" className="col-span-1"
                      onClick={() => setServiceTiers((p) => p.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setServiceTiers((p) => [...p, { min_subtotal: 0, max_subtotal: null, percentage: 5, display_order: p.length + 1, is_active: true }])}>
                  <Plus className="w-4 h-4 mr-1" /> Add tier
                </Button>
              </CardContent>
            </Card>

            {/* Delivery Fee Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Fee Tiers (by distance)</CardTitle>
                <CardDescription>Straight-line km between store and buyer's GPS pin. Tiers absorb traffic variance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveryTiers.map((t, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">From (km)</Label>
                      <Input type="number" step="0.5" value={t.min_km}
                        onChange={(e) => setDeliveryTiers((p) => p.map((x, idx) => idx === i ? { ...x, min_km: Number(e.target.value) || 0 } : x))} />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">To (km, blank = ∞)</Label>
                      <Input type="number" step="0.5" value={t.max_km ?? ""}
                        onChange={(e) => setDeliveryTiers((p) => p.map((x, idx) => idx === i ? { ...x, max_km: e.target.value === "" ? null : Number(e.target.value) } : x))} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Fee (₦)</Label>
                      <Input type="number" value={t.fee}
                        onChange={(e) => setDeliveryTiers((p) => p.map((x, idx) => idx === i ? { ...x, fee: Number(e.target.value) || 0 } : x))} />
                    </div>
                    <Button variant="ghost" size="icon" className="col-span-1"
                      onClick={() => setDeliveryTiers((p) => p.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDeliveryTiers((p) => [...p, { min_km: 0, max_km: null, fee: 1500, display_order: p.length + 1, is_active: true }])}>
                  <Plus className="w-4 h-4 mr-1" /> Add tier
                </Button>
              </CardContent>
            </Card>

            {/* Profit Protection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Profit Protection</CardTitle>
                <CardDescription>Floor & dynamic levers that protect margins.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Shield className="w-4 h-4" /> Minimum Delivery Fee (₦)</Label>
                    <Input type="number" value={minDeliveryFee} onChange={(e) => setMinDeliveryFee(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground">Delivery never drops below this floor.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><PackageOpen className="w-4 h-4" /> Heavy Order Surcharge (₦)</Label>
                    <Input type="number" value={heavySurcharge} onChange={(e) => setHeavySurcharge(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground">Added when an agent flags an order as heavy/bulk.</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label className="flex items-center gap-2 text-base"><Zap className="w-4 h-4" /> Surge Pricing</Label>
                    <p className="text-sm text-muted-foreground">Toggle ON during rain, fuel scarcity, or peak hours. Multiplies the delivery fee.</p>
                  </div>
                  <Switch checked={surgeActive} onCheckedChange={setSurgeActive} />
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label className="text-xs">Surge Multiplier (e.g. 1.25 = +25%)</Label>
                  <Input type="number" step="0.05" value={surgeMultiplier} onChange={(e) => setSurgeMultiplier(Number(e.target.value) || 1)} disabled={!surgeActive} />
                </div>
              </CardContent>
            </Card>

            <div className="sticky bottom-0 bg-background py-3 border-t">
              <Button onClick={saveAll} disabled={saving} size="lg">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save All Pricing Rules
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Current tiers preview: {serviceTiers.map((t) => `${fmt(t.min_subtotal)}–${t.max_subtotal ? fmt(t.max_subtotal) : "∞"} = ${t.percentage}%`).join(" · ")}
              </p>
            </div>
          </>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSettings;
