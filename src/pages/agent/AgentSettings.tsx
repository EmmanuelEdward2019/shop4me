import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { NotificationToggle } from "@/components/notifications/PushNotificationPrompt";
import ProfileInfoSection from "@/components/agent/ProfileInfoSection";
import BankingSection from "@/components/agent/BankingSection";
import VehicleSection from "@/components/agent/VehicleSection";
import AgentStatusSection from "@/components/agent/AgentStatusSection";
import PhotoUploadSection from "@/components/agent/PhotoUploadSection";
import MarketKnowledgeSection from "@/components/agent/MarketKnowledgeSection";
import ExperienceSection from "@/components/agent/ExperienceSection";

interface AgentApplication {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  lga: string | null;
  bank_name: string;
  account_name: string;
  account_number: string;
  has_vehicle: boolean | null;
  vehicle_type: string | null;
  status: string;
  photo_url: string | null;
  market_knowledge: string[] | null;
  experience_description: string | null;
}

const AgentSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBanking, setSavingBanking] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingMarkets, setSavingMarkets] = useState(false);
  const [savingExperience, setSavingExperience] = useState(false);
  const [application, setApplication] = useState<AgentApplication | null>(null);

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
    has_vehicle: false,
    vehicle_type: "",
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [marketKnowledge, setMarketKnowledge] = useState<string[]>([]);
  const [experienceDescription, setExperienceDescription] = useState("");

  useEffect(() => {
    if (user) {
      fetchAgentApplication();
    }
  }, [user]);

  const fetchAgentApplication = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agent_applications")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return; // No application row yet — settings will show prompts to apply

      setApplication(data);
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
        has_vehicle: data.has_vehicle || false,
        vehicle_type: data.vehicle_type || "",
      });
      setPhotoUrl(data.photo_url || null);
      setMarketKnowledge(data.market_knowledge || []);
      setExperienceDescription(data.experience_description || "");
    } catch (error) {
      console.error("Error fetching agent application:", error);
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
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
        })
        .eq("user_id", user?.id);

      toast({
        title: "Profile Updated",
        description: "Your personal information has been updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
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

      toast({
        title: "Banking Info Updated",
        description: "Your banking information has been updated.",
      });
    } catch (error) {
      console.error("Error updating banking info:", error);
      toast({
        title: "Error",
        description: "Failed to update banking information",
        variant: "destructive",
      });
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

      toast({
        title: "Vehicle Info Updated",
        description: "Your vehicle information has been updated.",
      });
    } catch (error) {
      console.error("Error updating vehicle info:", error);
      toast({
        title: "Error",
        description: "Failed to update vehicle information",
        variant: "destructive",
      });
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleSaveMarkets = async () => {
    setSavingMarkets(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({
          market_knowledge: marketKnowledge,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Market Knowledge Updated",
        description: "Your market expertise has been updated.",
      });
    } catch (error) {
      console.error("Error updating market knowledge:", error);
      toast({
        title: "Error",
        description: "Failed to update market knowledge",
        variant: "destructive",
      });
    } finally {
      setSavingMarkets(false);
    }
  };

  const handleSaveExperience = async () => {
    setSavingExperience(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({
          experience_description: experienceDescription,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Experience Updated",
        description: "Your experience description has been updated.",
      });
    } catch (error) {
      console.error("Error updating experience:", error);
      toast({
        title: "Error",
        description: "Failed to update experience",
        variant: "destructive",
      });
    } finally {
      setSavingExperience(false);
    }
  };

  return (
    <AgentDashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your agent profile and preferences.
          </p>
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
          email={application?.email || user?.email || ""}
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

        <MarketKnowledgeSection
          loading={loading}
          saving={savingMarkets}
          selectedMarkets={marketKnowledge}
          onMarketsChange={setMarketKnowledge}
          onSave={handleSaveMarkets}
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

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications from buyers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationToggle />
          </CardContent>
        </Card>

        <AgentStatusSection loading={loading} status={application?.status || null} />
      </div>
    </AgentDashboardLayout>
  );
};

export default AgentSettings;
