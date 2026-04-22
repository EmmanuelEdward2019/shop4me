import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Store, Tag, Loader2, Upload, Image } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface StoreRecord {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  area: string;
  city: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  image_url: string | null;
  assigned_agent_id: string | null;
  branch_name: string | null;
  parent_brand: string | null;
  address: string | null;
  phone: string | null;
}

interface AgentOption {
  user_id: string;
  full_name: string;
}

const AdminStores = () => {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: "", slug: "", icon: "Store", display_order: 0 });
  const [catSaving, setCatSaving] = useState(false);

  // Store dialog
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreRecord | null>(null);
  const [storeForm, setStoreForm] = useState({
    name: "", slug: "", category_id: "", area: "", city: "Port Harcourt",
    description: "", latitude: "", longitude: "", image_url: "",
    assigned_agent_id: "", branch_name: "", parent_brand: "", address: "", phone: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [storeSaving, setStoreSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, storeRes, agentRes] = await Promise.all([
      supabase.from("store_categories").select("*").order("display_order"),
      supabase.from("stores").select("*").order("name"),
      supabase.from("agent_applications").select("user_id, full_name").eq("status", "approved"),
    ]);
    setCategories((catRes.data as StoreCategory[]) || []);
    setStores((storeRes.data as StoreRecord[]) || []);
    setAgents((agentRes.data as AgentOption[]) || []);
    setLoading(false);
  };

  // Category CRUD
  const openCatDialog = (cat?: StoreCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({ name: cat.name, slug: cat.slug, icon: cat.icon, display_order: cat.display_order });
    } else {
      setEditingCategory(null);
      setCatForm({ name: "", slug: "", icon: "Store", display_order: categories.length + 1 });
    }
    setCatDialogOpen(true);
  };

  const saveCat = async () => {
    setCatSaving(true);
    const slug = catForm.slug || catForm.name.toLowerCase().replace(/\s+/g, "-");
    try {
      if (editingCategory) {
        const { error } = await supabase.from("store_categories").update({
          name: catForm.name, slug, icon: catForm.icon, display_order: catForm.display_order,
        }).eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_categories").insert({
          name: catForm.name, slug, icon: catForm.icon, display_order: catForm.display_order,
        });
        if (error) throw error;
      }
      toast.success(editingCategory ? "Category updated" : "Category created");
      setCatDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to save category");
    } finally {
      setCatSaving(false);
    }
  };

  const toggleCatActive = async (cat: StoreCategory) => {
    await supabase.from("store_categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    fetchData();
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Delete this category? Stores in it will become uncategorized.")) return;
    await supabase.from("store_categories").delete().eq("id", id);
    fetchData();
    toast.success("Category deleted");
  };

  // Store CRUD
  const openStoreDialog = (store?: StoreRecord) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({
        name: store.name, slug: store.slug, category_id: store.category_id || "",
        area: store.area, city: store.city, description: store.description || "",
        latitude: store.latitude?.toString() || "", longitude: store.longitude?.toString() || "",
        image_url: store.image_url || "", assigned_agent_id: store.assigned_agent_id || "",
        branch_name: store.branch_name || "", parent_brand: store.parent_brand || "",
        address: store.address || "", phone: store.phone || "",
      });
    } else {
      setEditingStore(null);
      setStoreForm({
        name: "", slug: "", category_id: "", area: "", city: "Port Harcourt",
        description: "", latitude: "", longitude: "", image_url: "",
        assigned_agent_id: "", branch_name: "", parent_brand: "", address: "", phone: "",
      });
    }
    setStoreDialogOpen(true);
  };

  const saveStore = async () => {
    setStoreSaving(true);
    const slug = storeForm.slug || storeForm.name.toLowerCase().replace(/\s+/g, "-");
    const payload = {
      name: storeForm.name, slug,
      category_id: storeForm.category_id || null,
      area: storeForm.area, city: storeForm.city,
      description: storeForm.description,
      latitude: storeForm.latitude ? parseFloat(storeForm.latitude) : null,
      longitude: storeForm.longitude ? parseFloat(storeForm.longitude) : null,
      image_url: storeForm.image_url || null,
      assigned_agent_id: storeForm.assigned_agent_id || null,
      branch_name: storeForm.branch_name || null,
      parent_brand: storeForm.parent_brand || null,
      address: storeForm.address || null,
      phone: storeForm.phone || null,
    };
    try {
      if (editingStore) {
        const { error } = await supabase.from("stores").update(payload).eq("id", editingStore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stores").insert(payload);
        if (error) throw error;
      }
      toast.success(editingStore ? "Store updated" : "Store added");
      setStoreDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to save store");
    } finally {
      setStoreSaving(false);
    }
  };

  const toggleStoreActive = async (store: StoreRecord) => {
    await supabase.from("stores").update({ is_active: !store.is_active }).eq("id", store.id);
    fetchData();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-images")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("store-images")
        .getPublicUrl(filePath);
      setStoreForm(p => ({ ...p, image_url: publicUrl }));
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm("Delete this store?")) return;
    await supabase.from("stores").delete().eq("id", id);
    fetchData();
    toast.success("Store deleted");
  };

  const getCategoryName = (catId: string | null) => {
    if (!catId) return "Uncategorized";
    return categories.find(c => c.id === catId)?.name || "Unknown";
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Stores & Categories</h1>
          <p className="text-muted-foreground">Manage shopping locations and their categories</p>
        </div>

        <Tabs defaultValue="stores">
          <TabsList>
            <TabsTrigger value="stores">Stores ({stores.length})</TabsTrigger>
            <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          </TabsList>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openStoreDialog()}>
                <Plus className="w-4 h-4 mr-2" /> Add Store
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Assigned Agent</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stores.map((store) => {
                        const assignedAgent = agents.find(a => a.user_id === store.assigned_agent_id);
                        return (
                        <TableRow key={store.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{store.name}</span>
                              {store.branch_name && (
                                <span className="block text-xs text-muted-foreground">{store.branch_name} branch</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {store.parent_brand ? (
                              <Badge variant="secondary">{store.parent_brand}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoryName(store.category_id)}</Badge>
                          </TableCell>
                          <TableCell>{store.area}</TableCell>
                          <TableCell>
                            {assignedAgent ? (
                              <Badge variant="default" className="text-xs">{assignedAgent.full_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch checked={store.is_active} onCheckedChange={() => toggleStoreActive(store)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openStoreDialog(store)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteStore(store.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCatDialog()}>
                <Plus className="w-4 h-4 mr-2" /> Add Category
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Stores</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                        <TableCell>{cat.display_order}</TableCell>
                        <TableCell>{stores.filter(s => s.category_id === cat.id).length}</TableCell>
                        <TableCell>
                          <Switch checked={cat.is_active} onCheckedChange={() => toggleCatActive(cat)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openCatDialog(cat)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteCat(cat.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Supermarkets" />
            </div>
            <div className="space-y-2">
              <Label>Slug (auto-generated if empty)</Label>
              <Input value={catForm.slug} onChange={e => setCatForm(p => ({ ...p, slug: e.target.value }))} placeholder="e.g., supermarkets" />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={catForm.icon} onValueChange={v => setCatForm(p => ({ ...p, icon: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Store">Store</SelectItem>
                  <SelectItem value="ShoppingCart">ShoppingCart</SelectItem>
                  <SelectItem value="ShoppingBag">ShoppingBag</SelectItem>
                  <SelectItem value="Utensils">Utensils</SelectItem>
                  <SelectItem value="Pill">Pill</SelectItem>
                  <SelectItem value="Building2">Building</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={catForm.display_order} onChange={e => setCatForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={catSaving || !catForm.name}>
              {catSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStore ? "Edit Store" : "Add Store"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parent Brand</Label>
                <Input value={storeForm.parent_brand} onChange={e => setStoreForm(p => ({ ...p, parent_brand: e.target.value }))} placeholder="e.g., Genesis Restaurant" />
              </div>
              <div className="space-y-2">
                <Label>Branch Name</Label>
                <Input value={storeForm.branch_name} onChange={e => setStoreForm(p => ({ ...p, branch_name: e.target.value }))} placeholder="e.g., Choba" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Store Name *</Label>
              <Input value={storeForm.name} onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Genesis Choba" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={storeForm.category_id} onValueChange={v => setStoreForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area *</Label>
                <Input value={storeForm.area} onChange={e => setStoreForm(p => ({ ...p, area: e.target.value }))} placeholder="e.g., Mile 3" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={storeForm.city} onChange={e => setStoreForm(p => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={storeForm.address} onChange={e => setStoreForm(p => ({ ...p, address: e.target.value }))} placeholder="Full street address" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={storeForm.phone} onChange={e => setStoreForm(p => ({ ...p, phone: e.target.value }))} placeholder="e.g., 0700..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={storeForm.description} onChange={e => setStoreForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Store Image</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input value={storeForm.image_url} onChange={e => setStoreForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://... or upload below" />
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingImage} asChild>
                    <span>
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    </span>
                  </Button>
                </label>
              </div>
              {storeForm.image_url && (
                <img src={storeForm.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-border mt-2" />
              )}
            </div>
            {/* Dedicated Agent Assignment */}
            <div className="space-y-2">
              <Label>Dedicated Agent (optional)</Label>
              <Select value={storeForm.assigned_agent_id} onValueChange={v => setStoreForm(p => ({ ...p, assigned_agent_id: v === "_none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No dedicated agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No dedicated agent</SelectItem>
                  {agents.map(a => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">If set, order notifications go only to this agent</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input value={storeForm.latitude} onChange={e => setStoreForm(p => ({ ...p, latitude: e.target.value }))} placeholder="e.g., 4.8156" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input value={storeForm.longitude} onChange={e => setStoreForm(p => ({ ...p, longitude: e.target.value }))} placeholder="e.g., 7.0498" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveStore} disabled={storeSaving || !storeForm.name || !storeForm.area}>
              {storeSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingStore ? "Update" : "Add Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminStores;
