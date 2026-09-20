import { useCallback, useEffect, useMemo, useState } from "react";
import { Lightbulb, Loader2, Package, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SHOPPING_UNITS } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// `store_products` postdates the generated Supabase types.
const db = supabase as never as { from: (t: string) => any };

/** Resolve the unit label the apps stored back to a SHOPPING_UNITS value. */
function unitFromLabel(label: string | null | undefined): string {
  const t = (label ?? "").trim().toLowerCase();
  if (!t) return "piece";
  const hit = SHOPPING_UNITS.find((u) =>
    u.value === t
    || u.label.toLowerCase() === t
    // RN stores "Kg", the web stores "Kg (Kilogram)" — compare without the aside.
    || u.label.toLowerCase().replace(/\s*\(.*\)$/, "") === t);
  return hit?.value ?? "piece";
}

interface Suggestion {
  category_id: string;
  category_name: string;
  normalized_name: string;
  display_name: string;
  suggested_unit: string | null;
  times_requested: number;
  buyers: number;
  last_requested: string;
}

/**
 * Items buyers typed by hand that aren't in the catalog — i.e. gaps in it.
 *
 * Derived from order history rather than reported by the apps, so it covers the
 * web app and every order placed before the catalog existed, and it clears
 * itself: promoting an item or dismissing it removes it from the list.
 */
function SuggestionsPanel({
  categoryId, categoryName, onPromoted,
}: { categoryId: string | null; categoryName: string; onPromoted: () => void }) {
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    if (!categoryId) { setRows([]); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase as never as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Suggestion[] | null; error: { message: string } | null }>;
      }).rpc("admin_inventory_suggestions", { p_category_id: categoryId, p_min_requests: 1, p_limit: 200 });
      if (error) throw new Error(error.message);
      setRows(data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load suggestions");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => { void load(); }, [load]);

  const promote = async (list: Suggestion[]) => {
    if (!categoryId || !list.length) return;
    const { error } = await db.from("store_products").insert(list.map((s, i) => ({
      category_id: categoryId,
      name: s.display_name,
      unit: unitFromLabel(s.suggested_unit),
      // Park them after the seeded items so a promotion never reshuffles the list.
      display_order: 5000 + i * 10,
    })));
    if (error) throw new Error(error.message);
  };

  const addOne = async (s: Suggestion) => {
    setBusyName(s.normalized_name);
    try {
      await promote([s]);
      toast.success(`"${s.display_name}" added to ${categoryName}`);
      setRows((r) => r.filter((x) => x.normalized_name !== s.normalized_name));
      onPromoted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the item");
    } finally {
      setBusyName(null);
    }
  };

  const addAll = async () => {
    setBulkBusy(true);
    try {
      await promote(rows);
      toast.success(`Added ${rows.length} item${rows.length === 1 ? "" : "s"} to ${categoryName}`);
      setRows([]);
      onPromoted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the items");
    } finally {
      setBulkBusy(false);
    }
  };

  const dismiss = async (s: Suggestion) => {
    setBusyName(s.normalized_name);
    try {
      const { error } = await db.from("store_product_suggestion_dismissals").insert({
        category_id: categoryId, normalized_name: s.normalized_name,
      });
      if (error) throw new Error(error.message);
      setRows((r) => r.filter((x) => x.normalized_name !== s.normalized_name));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not dismiss");
    } finally {
      setBusyName(null);
    }
  };

  if (!categoryId) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Asked for but not stocked
              {rows.length > 0 && <Badge variant="secondary">{rows.length}</Badge>}
            </CardTitle>
            <CardDescription>
              Items buyers typed by hand on {categoryName} orders. Adding one puts it in front of
              every buyer shopping this category.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {rows.length > 0 && (
              <Button size="sm" onClick={addAll} disabled={bulkBusy}>
                {bulkBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add all {rows.length}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Nothing missing — every item buyers asked for on {categoryName} orders is already listed.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item buyers asked for</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Buyers</TableHead>
                <TableHead>Last asked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.normalized_name}>
                  <TableCell className="font-medium">{s.display_name}</TableCell>
                  <TableCell><Badge variant="outline">{unitFromLabel(s.suggested_unit)}</Badge></TableCell>
                  <TableCell>{s.times_requested}</TableCell>
                  <TableCell>{s.buyers}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(s.last_requested).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={busyName === s.normalized_name} onClick={() => addOne(s)}>
                        {busyName === s.normalized_name
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Plus className="w-3.5 h-3.5 mr-1" />}
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyName === s.normalized_name} onClick={() => dismiss(s)}>
                        <X className="w-3.5 h-3.5" />
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
  );
}

export interface InventoryCategory { id: string; name: string; slug: string }
export interface InventoryStore { id: string; name: string; branch_name: string | null; category_id: string | null }

interface ProductRow {
  id: string;
  store_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  unit: string;
  image_url: string | null;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
}

type Scope = { kind: "category"; id: string } | { kind: "store"; id: string };

const emptyForm = () => ({
  name: "", description: "", unit: "piece", image_url: "",
  is_featured: false, display_order: 0, is_active: true,
});

const SELECT = "id, store_id, category_id, name, description, unit, image_url, is_featured, display_order, is_active";

/**
 * Inventory per store.
 *
 * Items live in one table with two scopes: a row on a CATEGORY is offered by
 * every store in it (all local markets sell the same fish, palm oil, garri…),
 * and a row on a STORE belongs to that store alone. Picking a store here shows
 * both — the inherited defaults read-only, its own items editable — so an admin
 * can see exactly what a buyer will see.
 *
 * Buyers are never limited to this list; it only pre-fills the shopping list,
 * and anything missing can still be typed by hand in the app.
 */
export default function StoreInventoryManager({
  categories, stores,
}: { categories: InventoryCategory[]; stores: InventoryStore[] }) {
  const [scope, setScope] = useState<Scope | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [inherited, setInherited] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkUnit, setBulkUnit] = useState("piece");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Default to the first category so the tab is never an empty shell.
  useEffect(() => {
    if (!scope && categories.length) setScope({ kind: "category", id: categories[0].id });
  }, [categories, scope]);

  const selectedStore = scope?.kind === "store" ? stores.find((s) => s.id === scope.id) ?? null : null;

  const load = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    try {
      const own = await db.from("store_products").select(SELECT)
        .eq(scope.kind === "store" ? "store_id" : "category_id", scope.id)
        .order("display_order");
      if (own.error) throw own.error;
      setProducts((own.data ?? []) as ProductRow[]);

      // A store also shows (read-only) whatever its category already provides.
      const store = scope.kind === "store" ? stores.find((s) => s.id === scope.id) : null;
      if (store?.category_id) {
        const inh = await db.from("store_products").select(SELECT)
          .eq("category_id", store.category_id).order("display_order");
        setInherited((inh.data ?? []) as ProductRow[]);
      } else {
        setInherited([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }, [scope, stores]);

  useEffect(() => { void load(); }, [load]);

  const openDialog = (row?: ProductRow) => {
    if (row) {
      setEditing(row);
      setForm({
        name: row.name, description: row.description ?? "", unit: row.unit,
        image_url: row.image_url ?? "", is_featured: row.is_featured,
        display_order: row.display_order, is_active: row.is_active,
      });
    } else {
      setEditing(null);
      // Drop new items at the end of the list rather than the top.
      const maxOrder = products.reduce((m, p) => Math.max(m, p.display_order), 0);
      setForm({ ...emptyForm(), display_order: maxOrder + 10 });
    }
    setDialogOpen(true);
  };

  const save = async () => {
    if (!scope) return;
    const name = form.name.trim();
    if (!name) { toast.error("Give the item a name"); return; }
    setSaving(true);
    try {
      const payload = {
        store_id: scope.kind === "store" ? scope.id : null,
        category_id: scope.kind === "category" ? scope.id : null,
        name,
        description: form.description.trim() || null,
        unit: form.unit,
        image_url: form.image_url.trim() || null,
        is_featured: form.is_featured,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
      };
      const { error } = editing
        ? await db.from("store_products").update(payload).eq("id", editing.id)
        : await db.from("store_products").insert(payload);
      if (error) throw error;
      toast.success(editing ? "Item updated" : "Item added");
      setDialogOpen(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save the item";
      // The unique index is what stops a double-tap creating "Palm Oil" twice.
      toast.error(/duplicate key/i.test(msg) ? `"${form.name.trim()}" is already on this list` : msg);
    } finally {
      setSaving(false);
    }
  };

  /** Paste a whole market list at once — one item per line. */
  const saveBulk = async () => {
    if (!scope) return;
    const names = [...new Set(
      bulkText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.slice(0, 120)),
    )];
    if (!names.length) { toast.error("Add at least one item name"); return; }
    setBulkSaving(true);
    try {
      const existing = new Set(products.map((p) => p.name.trim().toLowerCase()));
      const fresh = names.filter((n) => !existing.has(n.toLowerCase()));
      if (!fresh.length) { toast.message("Every one of those is already listed"); return; }
      let order = products.reduce((m, p) => Math.max(m, p.display_order), 0);
      const { error } = await db.from("store_products").insert(fresh.map((name) => ({
        store_id: scope.kind === "store" ? scope.id : null,
        category_id: scope.kind === "category" ? scope.id : null,
        name, unit: bulkUnit, display_order: (order += 10),
      })));
      if (error) throw error;
      toast.success(`Added ${fresh.length} item${fresh.length === 1 ? "" : "s"}`);
      setBulkText("");
      setBulkOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the items");
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleActive = async (row: ProductRow) => {
    await db.from("store_products").update({ is_active: !row.is_active }).eq("id", row.id);
    setProducts((p) => p.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
  };

  const toggleFeatured = async (row: ProductRow) => {
    await db.from("store_products").update({ is_featured: !row.is_featured }).eq("id", row.id);
    setProducts((p) => p.map((r) => (r.id === row.id ? { ...r, is_featured: !r.is_featured } : r)));
  };

  const remove = async (row: ProductRow) => {
    if (!confirm(`Remove "${row.name}" from this list?`)) return;
    const { error } = await db.from("store_products").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item removed");
    setProducts((p) => p.filter((r) => r.id !== row.id));
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("store-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-images").getPublicUrl(path);
      setForm((p) => ({ ...p, image_url: data.publicUrl }));
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  // A store-specific row with the same name overrides the category default.
  const ownNames = useMemo(
    () => new Set(products.map((p) => p.name.trim().toLowerCase())),
    [products],
  );
  const inheritedShown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = inherited.filter((p) => !ownNames.has(p.name.trim().toLowerCase()));
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [inherited, ownNames, search]);

  // Suggestions belong to a category. A store scope resolves to the category it
  // sits in, so promoting from there stocks every store in that category.
  const suggestionCategoryId = scope?.kind === "category" ? scope.id : selectedStore?.category_id ?? null;
  const suggestionCategoryName = categories.find((c) => c.id === suggestionCategoryId)?.name ?? "this category";

  const scopeLabel = scope?.kind === "category"
    ? categories.find((c) => c.id === scope.id)?.name ?? "category"
    : selectedStore?.name ?? "store";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> What stores sell
          </CardTitle>
          <CardDescription>
            An item on a <strong>category</strong> is offered by every store in it — the quickest way to
            stock all local markets at once. An item on a <strong>store</strong> belongs to that store
            only. Buyers can still type anything that isn't listed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category list</Label>
            <Select
              value={scope?.kind === "category" ? scope.id : ""}
              onValueChange={(id) => { setSearch(""); setScope({ kind: "category", id }); }}
            >
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Or a single store</Label>
            <Select
              value={scope?.kind === "store" ? scope.id : ""}
              onValueChange={(id) => { setSearch(""); setScope({ kind: "store", id }); }}
            >
              <SelectTrigger><SelectValue placeholder="Pick a store" /></SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.branch_name ? ` — ${s.branch_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${scopeLabel} items…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} disabled={!scope}>
            <Sparkles className="w-4 h-4 mr-2" /> Bulk add
          </Button>
          <Button onClick={() => openDialog()} disabled={!scope}>
            <Plus className="w-4 h-4 mr-2" /> Add item
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : shown.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              {search.trim()
                ? `No item matches "${search.trim()}".`
                : `Nothing listed for ${scopeLabel} yet. Add items or paste a whole list with Bulk add.`}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px]">Photo</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>In app slider</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.image_url ? (
                        <img src={row.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{row.name}</span>
                      {row.description && (
                        <span className="block text-xs text-muted-foreground">{row.description}</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{row.unit}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{row.display_order}</TableCell>
                    <TableCell>
                      <Switch checked={row.is_featured} onCheckedChange={() => toggleFeatured(row)} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active} onCheckedChange={() => toggleActive(row)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDialog(row)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(row)}>
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

      {scope?.kind === "store" && inheritedShown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Also offered here ({inheritedShown.length})
            </CardTitle>
            <CardDescription>
              Inherited from the {categories.find((c) => c.id === selectedStore?.category_id)?.name ?? "category"} list.
              Buyers see these too. Edit them on the category, or add an item with the same name here to
              override it for this store only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {inheritedShown.map((p) => (
                <Badge key={p.id} variant="secondary" className={p.is_active ? "" : "opacity-50 line-through"}>
                  {p.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SuggestionsPanel
        categoryId={suggestionCategoryId}
        categoryName={suggestionCategoryName}
        onPromoted={load}
      />

      {/* Add / edit one item */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>
              {scope?.kind === "category"
                ? `Every store in ${scopeLabel} will offer this.`
                : `Only ${scopeLabel} will offer this.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Item name</Label>
              <Input
                id="inv-name" value={form.name} maxLength={120}
                placeholder="e.g. Palm Oil"
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-desc">Note for the agent (optional)</Label>
              <Input
                id="inv-desc" value={form.description}
                placeholder="e.g. Local red oil, not refined"
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sold by</Label>
                <Select value={form.unit} onValueChange={(unit) => setForm((p) => ({ ...p, unit }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHOPPING_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-order">Display order</Label>
                <Input
                  id="inv-order" type="number" value={form.display_order}
                  onChange={(e) => setForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Photo</Label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img src={form.image_url} alt="" className="w-14 h-14 rounded object-cover border" />
                )}
                <Input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} />
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Optional. Without one the app shows a themed stock photo for the item.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Show in the app's home slider</Label>
                <p className="text-xs text-muted-foreground">
                  Featured items rotate on the buyer home screen.
                </p>
              </div>
              <Switch
                checked={form.is_featured}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_featured: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="cursor-pointer">Active</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? "Save changes" : "Add item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paste a whole list */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk add items</DialogTitle>
            <DialogDescription>
              One item per line. Anything already on {scopeLabel}'s list is skipped, so you can paste
              the same list twice safely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              rows={10}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"Palm Oil\nCrayfish\nAfang Leaf\nPeriwinkle\nGarri"}
            />
            <div className="space-y-1.5">
              <Label>Sold by (applies to all)</Label>
              <Select value={bulkUnit} onValueChange={setBulkUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHOPPING_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">You can change any item's unit afterwards.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button onClick={saveBulk} disabled={bulkSaving}>
                {bulkSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Add items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
