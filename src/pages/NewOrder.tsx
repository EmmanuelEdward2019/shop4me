import { useState, useEffect } from "react";
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
import { Plus, Trash2, MapPin, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { portHarcourtLocations } from "@/lib/port-harcourt-stores";

// Port Harcourt stores (primary) + other cities coming soon
const locations = [
  ...portHarcourtLocations,
];

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
  const preselectedStore = searchParams.get("store");
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
      notes: "",
      items: [{ name: "", description: "", quantity: 1, unit: "pcs", estimatedPrice: undefined }],
    },
  });

  // Set preselected store when URL param changes
  useEffect(() => {
    if (preselectedStore) {
      const storeExists = locations.some(l => l.name === preselectedStore);
      if (storeExists) {
        setValue("location", preselectedStore);
      }
    }
  }, [preselectedStore, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedLocation = watch("location");
  const locationData = locations.find((l) => l.name === selectedLocation);

  const onSubmit = async (data: OrderFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Calculate estimated total
      const estimatedTotal = data.items.reduce(
        (sum, item) => sum + (item.estimatedPrice || 0) * item.quantity,
        0
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          location_name: data.location,
          location_type: locationData?.type || "market",
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
            <CardContent>
              <Select
                value={selectedLocation}
                onValueChange={(value) => setValue("location", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.name} value={loc.name}>
                      <div className="flex items-center gap-2">
                        <span>{loc.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({loc.type} • {loc.city})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && (
                <p className="text-sm text-destructive mt-2">
                  {errors.location.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Shopping List */}
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
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

                    <div className="space-y-2 sm:col-span-2">
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
