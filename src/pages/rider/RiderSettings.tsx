import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RiderDashboardLayout from "@/components/dashboard/RiderDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import PhotoUploadSection from "@/components/agent/PhotoUploadSection";
import ProfileInfoSection from "@/components/agent/ProfileInfoSection";
import BankingSection from "@/components/agent/BankingSection";
import VehicleSection from "@/components/agent/VehicleSection";
import ExperienceSection from "@/components/agent/ExperienceSection";
import { CheckCircle, Clock, XCircle, AlertTriangle, Bike } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const RiderSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBanking, setSavingBanking] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingExperience, setSavingExperience] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [applicationEmail, setApplicationEmail] = useState("");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    lga: "",
  });

  const [bankingData, setBankingData] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
  });

  const [vehicleData, setVehicleData] = useState({
    has_vehicle: true,
    vehicle_type: "motorcycle",
  });

  const [experienceDescription, setExperienceDescription] = useState("");

  useEffect(() => {
    if (user) fetchRiderApplication();
  }, [user]);

  const fetchRiderApplication = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agent_applications")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      setApplicationStatus(data.status);
      setApplicationEmail(data.email || "");
      setPhotoUrl(data.photo_url || null);
      setProfileData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        lga: data.lga || "",
      });
      setBankingData({
        bank_name: data.bank_name || "",
        account_name: data.account_name || "",
        account_number: data.account_number || "",
      });
      setVehicleData({
        has_vehicle: data.has_vehicle ?? true,
        vehicle_type: data.vehicle_type || "motorcycle",
      });
      setExperienceDescription(data.experience_description || "");
    } catch (error) {
      console.error("Error fetching rider application:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBankingChange = (field: string, value: string) => {
    setBankingData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehicleChange = (field: string, value: string | boolean) => {
    setVehicleData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          address: profileData.address,
          city: profileData.city,
          state: profileData.state,
          lga: profileData.lga,
        })
        .eq("user_id", user?.id);
      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ full_name: profileData.full_name, phone: profileData.phone })
        .eq("user_id", user?.id);

      toast({ title: "Profile Updated", description: "Your personal information has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBanking = async () => {
    setSavingBanking(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({
          bank_name: bankingData.bank_name,
          account_name: bankingData.account_name,
          account_number: bankingData.account_number,
        })
        .eq("user_id", user?.id);
      if (error) throw error;
      toast({ title: "Banking Info Updated", description: "Your banking information has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update banking information", variant: "destructive" });
    } finally {
      setSavingBanking(false);
    }
  };

  const handleSaveVehicle = async () => {
    setSavingVehicle(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({
          has_vehicle: vehicleData.has_vehicle,
          vehicle_type: vehicleData.has_vehicle ? vehicleData.vehicle_type : null,
        })
        .eq("user_id", user?.id);
      if (error) throw error;
      toast({ title: "Vehicle Info Updated", description: "Your vehicle information has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update vehicle information", variant: "destructive" });
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleSaveExperience = async () => {
    setSavingExperience(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({ experience_description: experienceDescription })
        .eq("user_id", user?.id);
      if (error) throw error;
      toast({ title: "Experience Updated", description: "Your experience description has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update experience", variant: "destructive" });
    } finally {
      setSavingExperience(false);
    }
  };

  const getStatusConfig = () => {
    switch (applicationStatus) {
      case "approved":
        return { icon: CheckCircle, title: "Active Rider", description: "You can accept and complete deliveries.", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", text: "text-green-800 dark:text-green-200", desc: "text-green-600 dark:text-green-400", iconBg: "bg-green-100 dark:bg-green-900", iconColor: "text-green-600 dark:text-green-400" };
      case "pending":
        return { icon: Clock, title: "Application Pending", description: "Your application is being reviewed.", bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-800 dark:text-yellow-200", desc: "text-yellow-600 dark:text-yellow-400", iconBg: "bg-yellow-100 dark:bg-yellow-900", iconColor: "text-yellow-600 dark:text-yellow-400" };
      case "under_review":
        return { icon: Clock, title: "Under Review", description: "An admin is reviewing your application.", bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-200 dark:border-blue-800", text: "text-blue-800 dark:text-blue-200", desc: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-100 dark:bg-blue-900", iconColor: "text-blue-600 dark:text-blue-400" };
      case "rejected":
        return { icon: XCircle, title: "Application Rejected", description: "Your application was not approved.", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", text: "text-red-800 dark:text-red-200", desc: "text-red-600 dark:text-red-400", iconBg: "bg-red-100 dark:bg-red-900", iconColor: "text-red-600 dark:text-red-400" };
      case "suspended":
        return { icon: AlertTriangle, title: "Account Suspended", description: "Your rider account has been suspended.", bg: "bg-orange-50 dark:bg-orange-950", border: "border-orange-200 dark:border-orange-800", text: "text-orange-800 dark:text-orange-200", desc: "text-orange-600 dark:text-orange-400", iconBg: "bg-orange-100 dark:bg-orange-900", iconColor: "text-orange-600 dark:text-orange-400" };
      default:
        return { icon: Bike, title: "Not a Rider", description: "You haven't applied to become a rider yet.", bg: "bg-muted", border: "border-border", text: "text-foreground", desc: "text-muted-foreground", iconBg: "bg-muted", iconColor: "text-muted-foreground" };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <RiderDashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your rider profile and preferences.</p>
        </div>

        <PhotoUploadSection
          loading={loading}
          userId={user?.id || ""}
          currentPhotoUrl={photoUrl}
          fullName={profileData.full_name}
          onPhotoUpdated={setPhotoUrl}
        />

        <ProfileInfoSection
          loading={loading}
          saving={savingProfile}
          email={applicationEmail || user?.email || ""}
          formData={profileData}
          onFormChange={handleProfileChange}
          onSave={handleSaveProfile}
        />

        <ExperienceSection
          loading={loading}
          saving={savingExperience}
          experienceDescription={experienceDescription}
          onChange={setExperienceDescription}
          onSave={handleSaveExperience}
        />

        <BankingSection
          loading={loading}
          saving={savingBanking}
          formData={bankingData}
          onFormChange={handleBankingChange}
          onSave={handleSaveBanking}
        />

        <VehicleSection
          loading={loading}
          saving={savingVehicle}
          formData={vehicleData}
          onFormChange={handleVehicleChange}
          onSave={handleSaveVehicle}
        />

        {/* Rider Status */}
        <Card>
          <CardHeader>
            <CardTitle>Rider Status</CardTitle>
            <CardDescription>Your current rider account status and verification.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className={`flex items-center justify-between p-4 border rounded-lg ${statusConfig.bg} ${statusConfig.border}`}>
                <div>
                  <p className={`font-medium ${statusConfig.text}`}>{statusConfig.title}</p>
                  <p className={`text-sm ${statusConfig.desc}`}>{statusConfig.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${statusConfig.iconBg} flex items-center justify-center`}>
                  <StatusIcon className={`w-5 h-5 ${statusConfig.iconColor}`} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RiderDashboardLayout>
  );
};

export default RiderSettings;
