import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Gift, Loader2, Tag, Truck, Percent, BadgeDollarSign, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Bonus {
  id: string;
  title: string;
  description: string | null;
  type: string;
  discount_value: number;
  min_order_value: number | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const BONUS_TYPES = [
  { value: "first_purchase", label: "First Purchase Discount", icon: Tag },
  { value: "free_delivery", label: "Free Delivery", icon: Truck },
  { value: "percentage_off", label: "Percentage Off", icon: Percent },
  { value: "fixed_off", label: "Fixed Amount Off", icon: BadgeDollarSign },
  { value: "bulk_discount", label: "Bulk / Volume Discount", icon: ShoppingBag },
];

const getBonusTypeLabel = (type: string) => BONUS_TYPES.find(t => t.value === type)?.label || type;

const getBonusValueDisplay = (bonus: Bonus) => {
  switch (bonus.type) {
    case "free_delivery": return "Free";
    case "percentage_off": return `${bonus.discount_value}% off`;
    case "fixed_off": return `₦${bonus.discount_value.toLocaleString()} off`;
    case "first_purchase": return `₦${bonus.discount_value.toLocaleString()} off`;
    case "bulk_discount": return `${bonus.discount_value}% off`;
    default: return `₦${bonus.discount_value.toLocaleString()}`;
  }
};

const emptyForm = {
  title: "",
  description: "",
  type: "first_purchase",
  discount_value: "",
  min_order_value: "",
  is_active: true,
  start_date: "",
  end_date: "",
};

const AdminBonuses = () => {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bonus | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBonuses(); }, []);

  const fetchBonuses = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("bonuses")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setBonuses(data as Bonus[]);
    setLoading(false);
  };

  const openDialog = (bonus?: Bonus) => {
    if (bonus) {
      setEditing(bonus);
      setForm({
        title: bonus.title,
        description: bonus.description || "",
        type: bonus.type,
        discount_value: bonus.discount_value.toString(),
        min_order_value: bonus.min_order_value?.toString() || "",
        is_active: bonus.is_active,
        start_date: bonus.start_date ? bonus.start_date.slice(0, 10) : "",
        end_date: bonus.end_date ? bonus.end_date.slice(0, 10) : "",
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setDialogOpen(true);
  };

  const saveBonus = async () => {
    if (!form.title || !form.type) {
      toast.error("Title and type are required");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      discount_value: parseFloat(form.discount_value) || 0,
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
      is_active: form.is_active,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    try {
      if (editing) {
        const { error } = await (supabase as any).from("bonuses").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Bonus updated");
      } else {
        const { error } = await (supabase as any).from("bonuses").insert(payload);
        if (error) throw error;
        toast.success("Bonus created");
      }
      setDialogOpen(false);
      fetchBonuses();
    } catch (e: any) {
      toast.error(e.message || "Failed to save bonus");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (bonus: Bonus) => {
    await (supabase as any).from("bonuses").update({ is_active: !bonus.is_active }).eq("id", bonus.id);
    fetchBonuses();
  };

  const deleteBonus = async (id: string) => {
    if (!confirm("Delete this bonus?")) return;
    await (supabase as any).from("bonuses").delete().eq("id", id);
    fetchBonuses();
    toast.success("Bonus deleted");
  };

  const needsValue = form.type !== "free_delivery";

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bonuses & Promotions</h1>
          <p className="text-muted-foreground">Create and manage discount offers, free delivery periods, and volume deals</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total Bonuses</p>
              <p className="text-2xl font-bold">{bonuses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">{bonuses.filter(b => b.is_active).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Free Delivery</p>
              <p className="text-2xl font-bold">{bonuses.filter(b => b.type === "free_delivery" && b.is_active).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Disabled</p>
              <p className="text-2xl font-bold text-muted-foreground">{bonuses.filter(b => !b.is_active).length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" /> Create Bonus
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : bonuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Gift className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">No bonuses yet</p>
                <p className="text-sm text-muted-foreground mb-4">Create your first promotion to attract buyers</p>
                <Button onClick={() => openDialog()} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Create Bonus
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Min Order</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonuses.map((bonus) => (
                    <TableRow key={bonus.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{bonus.title}</p>
                          {bonus.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{bonus.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getBonusTypeLabel(bonus.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-primary">{getBonusValueDisplay(bonus)}</span>
                      </TableCell>
                      <TableCell>
                        {bonus.min_order_value
                          ? `₦${bonus.min_order_value.toLocaleString()}`
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {bonus.start_date ? new Date(bonus.start_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "Any"}
                          {" – "}
                          {bonus.end_date ? new Date(bonus.end_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "Open"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={bonus.is_active} onCheckedChange={() => toggleActive(bonus)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDialog(bonus)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteBonus(bonus.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bonus" : "Create Bonus"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g., ₦1,000 off your first purchase"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Briefly describe the offer to buyers..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Bonus Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BONUS_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsValue && (
              <div className="space-y-2">
                <Label>
                  {form.type === "percentage_off" || form.type === "bulk_discount"
                    ? "Discount Percentage (%)"
                    : "Discount Amount (₦)"}
                </Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                  placeholder={form.type === "percentage_off" || form.type === "bulk_discount" ? "e.g., 10" : "e.g., 1000"}
                  min={0}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Minimum Order Value (₦) <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="number"
                value={form.min_order_value}
                onChange={e => setForm(p => ({ ...p, min_order_value: e.target.value }))}
                placeholder="e.g., 5000 — leave blank for no minimum"
                min={0}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-muted-foreground">Buyers will see and benefit from this offer</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBonus} disabled={saving || !form.title}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminBonuses;
