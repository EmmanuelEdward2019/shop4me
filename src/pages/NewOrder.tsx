import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, MapPin, ShoppingCart, Loader2, Home, Building } from "lucide-react";
import MapPinPicker from "@/components/address/MapPinPicker";
import { toast } from "sonner";
import { useStoreCategories, useAllStores } from "@/hooks/useStores";

interface SavedAddress {
  id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  landmark: string | null;
  is_default: boolean;
}

// Locations are now loaded from DB via useStores hook

const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces" },
  { value: "packs", label: "Packs" },
  { value: "cartons", label: "Cartons" },
  { value: "kg", label: "Kg" },
  { value: "sachets", label: "Sachets" },
  { value: "bags", label: "Bags" },
  { value: "bottles", label: "Bottles" },
  { value: "crates", label: "Crates" },
  { value: "litres", label: "Litres" },
  { value: "dozens", label: "Dozens" },
];

const orderSchema = z.object({
  location: z.string().min(1, "Please select a location"),
  delivery_address_id: z.string().min(1, "Please select a delivery address"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "Item name is required"),
        description: z.string().optional(),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unit: z.string().default("pcs"),
        estimatedPrice: z.number().optional(),
      })
    )
    .min(1, "Add at least one item"),
});

type OrderFormData = z.infer<typeof orderSchema>;

const NewOrderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    address_line1: "",
    city: "",
    state: "",
    landmark: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const preselectedStore = searchParams.get("store");

  // Load categories and stores from DB
  const { categories, loading: loadingCategories } = useStoreCategories();
  const { stores: allStores, loading: loadingStores } = useAllStores();

  // Filter stores by selected category
  const filteredStores = useMemo(() => {
    if (!selectedCategoryId) return allStores;
    return allStores.filter(s => s.category_id === selectedCategoryId);
  }, [allStores, selectedCategoryId]);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      location: preselectedStore || "",
      delivery_address_id: "",
      notes: "",
      items: [{ name: "", description: "", quantity: 1, unit: "pcs", estimatedPrice: undefined }],
    },
  });

  // Fetch saved addresses
  useEffect(() => {
    if (!user) return;
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      const { data } = await supabase
        .from("delivery_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      const addresses = (data || []) as SavedAddress[];
      setSavedAddresses(addresses);
      // Auto-select default address
      const defaultAddr = addresses.find(a => a.is_default);
      if (defaultAddr) {
        setValue("delivery_address_id", defaultAddr.id);
      }
      setLoadingAddresses(false);
    };
    fetchAddresses();
  }, [user, setValue]);

  const handleSaveNewAddress = async () => {
    if (!user || !newAddress.address_line1 || !newAddress.city || !newAddress.state) {
      toast.error("Please fill in all required address fields");
      return;
    }
    setSavingAddress(true);
    try {
      const isFirst = savedAddresses.length === 0;
      const { data, error } = await supabase
        .from("delivery_addresses")
        .insert({
          user_id: user.id,
          label: newAddress.label || "Home",
          address_line1: newAddress.address_line1,
          city: newAddress.city,
          state: newAddress.state,
          landmark: newAddress.landmark || null,
          is_default: isFirst,
        })
        .select()
        .single();
      if (error) throw error;
      const addr = data as SavedAddress;
      setSavedAddresses(prev => [...prev, addr]);
      setValue("delivery_address_id", addr.id);
      setShowNewAddress(false);
      setNewAddress({ label: "Home", address_line1: "", city: "", state: "", landmark: "" });
      toast.success("Address saved!");
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const selectedAddressId = watch("delivery_address_id");

  // Set preselected store when URL param changes
  useEffect(() => {
    if (preselectedStore && allStores.length > 0) {
      const storeExists = allStores.some(s => s.name === preselectedStore);
      if (storeExists) {
        setValue("location", preselectedStore);
      }
    }
  }, [preselectedStore, allStores, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedLocation = watch("location");
  const locationData = allStores.find((s) => s.name === selectedLocation);

  const onSubmit = async (data: OrderFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Calculate estimated total
      const estimatedTotal = data.items.reduce(
        (sum, item) => sum + (item.estimatedPrice || 0) * item.quantity,
        0
      );

      // Create order - find the category name for the location_type
      const storeCat = categories.find(c => c.id === locationData?.category_id);
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          location_name: data.location,
          location_type: storeCat?.slug || locationData?.category_id || "market",
          delivery_address_id: data.delivery_address_id,
          notes: data.notes,
          estimated_total: estimatedTotal > 0 ? estimatedTotal : null,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = data.items.map((item) => {
        const unitLabel = UNIT_OPTIONS.find(u => u.value === item.unit)?.label || item.unit;
        const displayName = item.unit !== "pcs" ? `${item.name} (${item.quantity} ${unitLabel})` : item.name;
        return {
          order_id: order.id,
          name: displayName,
          description: item.description,
          quantity: item.quantity,
          estimated_price: item.estimatedPrice,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Send shopping list as initial chat message
      await supabase.from("chat_messages").insert({
        order_id: order.id,
        sender_id: user.id,
        message_type: "shopping_list",
        content: `Shopping list for ${data.location}`,
        metadata: {
          items: data.items.map((item) => {
            const unitLabel = UNIT_OPTIONS.find(u => u.value === item.unit)?.label || item.unit;
            return {
              id: crypto.randomUUID(),
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              unitLabel,
              estimatedPrice: item.estimatedPrice,
              description: item.description,
            };
          }),
        },
      });

      toast.success("Order created successfully!");
      navigate(`/dashboard/orders/${order.id}?tab=chat`);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Create New Order
          </h1>
          <p className="text-muted-foreground">
            Tell us what you need and where to shop
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Location Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Shopping Location
              </CardTitle>
              <CardDescription>
                Choose where you want us to shop for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedCategoryId === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategoryId("")}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      type="button"
                      variant={selectedCategoryId === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategoryId(cat.id)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Store Select */}
              <Select
                value={selectedLocation}
                onValueChange={(value) => setValue("location", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingStores ? "Loading stores..." : "Select a store"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredStores.map((store) => (
                    <SelectItem key={store.id} value={store.name}>
                      <div className="flex items-center gap-2">
                        <span>{store.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({store.area} • {store.city})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {filteredStores.length === 0 && !loadingStores && (
                    <SelectItem value="_none" disabled>No stores in this category</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.location && (
                <p className="text-sm text-destructive mt-2">
                  {errors.location.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                Delivery Address
              </CardTitle>
              <CardDescription>
                Where should we deliver your items?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingAddresses ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading addresses...
                </div>
              ) : savedAddresses.length > 0 ? (
                <RadioGroup
                  value={selectedAddressId}
                  onValueChange={(value) => {
                    if (value === "new") {
                      setShowNewAddress(true);
                      setValue("delivery_address_id", "");
                    } else {
                      setShowNewAddress(false);
                      setValue("delivery_address_id", value);
                    }
                  }}
                  className="space-y-3"
                >
                  {savedAddresses.map((addr) => (
                    <div key={addr.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-1" />
                      <label htmlFor={`addr-${addr.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">{addr.label}</span>
                          {addr.is_default && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">{addr.city}, {addr.state}</p>
                        {addr.landmark && (
                          <p className="text-xs text-muted-foreground">Near: {addr.landmark}</p>
                        )}
                      </label>
                    </div>
                  ))}
                  <div
                    className={`flex items-center space-x-3 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${showNewAddress ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => {
                      setShowNewAddress(true);
                      setValue("delivery_address_id", "");
                    }}
                  >
                    <RadioGroupItem value="new" id="addr-new" className="mt-0" />
                    <label htmlFor="addr-new" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                      <Plus className="w-4 h-4" />
                      Add new address
                    </label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="text-center py-4">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No saved addresses</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddress(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Address
                  </Button>
                </div>
              )}

              {(showNewAddress || savedAddresses.length === 0) && (showNewAddress || savedAddresses.length === 0) && (
                <div className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
                  <p className="text-sm font-medium text-foreground">New Delivery Address</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Label</Label>
                      <Input
                        placeholder="e.g., Home, Office"
                        value={newAddress.label}
                        onChange={(e) => setNewAddress(p => ({ ...p, label: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Street Address *</Label>
                      <Input
                        placeholder="e.g., 12 Aba Road"
                        value={newAddress.address_line1}
                        onChange={(e) => setNewAddress(p => ({ ...p, address_line1: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City *</Label>
                      <Input
                        placeholder="e.g., Port Harcourt"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress(p => ({ ...p, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State *</Label>
                      <Input
                        placeholder="e.g., Rivers"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress(p => ({ ...p, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Landmark (optional)</Label>
                      <Input
                        placeholder="Near a popular location"
                        value={newAddress.landmark}
                        onChange={(e) => setNewAddress(p => ({ ...p, landmark: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button type="button" size="sm" onClick={handleSaveNewAddress} disabled={savingAddress}>
                    {savingAddress ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save & Use This Address
                  </Button>
                </div>
              )}

              {errors.delivery_address_id && (
                <p className="text-sm text-destructive">
                  {errors.delivery_address_id.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Shopping List
              </CardTitle>
              <CardDescription>
                Add items you want us to buy. Be as specific as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border border-border rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Item {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2 sm:col-span-3">
                        <Label>Item Name *</Label>
                        <Input
                          placeholder="e.g., Samsung Galaxy S24 Ultra"
                          {...register(`items.${index}.name`)}
                        />
                        {errors.items?.[index]?.name && (
                          <p className="text-sm text-destructive">
                            {errors.items[index]?.name?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 sm:col-span-3">
                        <Label>Description (optional)</Label>
                        <Textarea
                          placeholder="Color, size, brand preferences, etc."
                          {...register(`items.${index}.description`)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={watch(`items.${index}.unit`) || "pcs"}
                          onValueChange={(value) => setValue(`items.${index}.unit`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Estimated Price (₦)</Label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          {...register(`items.${index}.estimatedPrice`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  append({
                    name: "",
                    description: "",
                    quantity: 1,
                    unit: "pcs",
                    estimatedPrice: undefined,
                  })
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>

              {errors.items?.message && (
                <p className="text-sm text-destructive">{errors.items.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>
                Any special instructions for your agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Please check for discounts, I prefer brand new items only..."
                {...register("notes")}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : (
                "Submit Order"
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NewOrderPage;
