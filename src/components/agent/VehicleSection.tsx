import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Car, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VehicleSectionProps {
  loading: boolean;
  saving: boolean;
  formData: {
    has_vehicle: boolean;
    vehicle_type: string;
  };
  onFormChange: (field: string, value: string | boolean) => void;
  onSave: () => void;
}

const VehicleSection = ({
  loading,
  saving,
  formData,
  onFormChange,
  onSave,
}: VehicleSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          Vehicle Information
        </CardTitle>
        <CardDescription>
          Update your transportation details for deliveries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="has_vehicle">I have a vehicle</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle if you own a vehicle for deliveries
                </p>
              </div>
              <Switch
                id="has_vehicle"
                checked={formData.has_vehicle}
                onCheckedChange={(checked) => onFormChange("has_vehicle", checked)}
              />
            </div>

            {formData.has_vehicle && (
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Input
                  id="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) => onFormChange("vehicle_type", e.target.value)}
                  placeholder="e.g., Motorcycle, Car, Bicycle"
                />
              </div>
            )}

            <Button onClick={onSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Vehicle Info"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleSection;
