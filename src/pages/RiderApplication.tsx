import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Loader2, Bike } from "lucide-react";

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara"
];

const nigerianBanks = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank", "First City Monument Bank",
  "Globus Bank", "Guaranty Trust Bank", "Heritage Bank", "Keystone Bank", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank",
  "Titan Trust Bank", "Union Bank", "United Bank for Africa", "Unity Bank", "Wema Bank", "Zenith Bank",
  "Kuda Bank", "OPay", "PalmPay", "Moniepoint"
];

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  id_type: string;
  id_number: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  has_vehicle: boolean;
  vehicle_type: string;
  experience_description: string;
}

const RiderApplication = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    email: user?.email || "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    id_type: "",
    id_number: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    has_vehicle: true,
    vehicle_type: "motorcycle",
    experience_description: "",
  });

  useEffect(() => {
    if (user) {
      checkExistingApplication();
      setFormData((prev) => ({ ...prev, email: user.email || "" }));
    } else {
      setCheckingApplication(false);
    }
  }, [user]);

  const checkExistingApplication = async () => {
    try {
      const { data } = await supabase
        .from("agent_applications")
        .select("*")
        .eq("user_id", user?.id)
        .eq("role_type", "rider")
        .maybeSingle();

      if (data) setExistingApplication(data);
    } catch (error) {
      console.error("Error checking application:", error);
    } finally {
      setCheckingApplication(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${folder}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("agent-documents").upload(fileName, file);
    if (error) return null;
    return fileName;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in first.", variant: "destructive" });
      navigate("/auth", { state: { from: "/rider-application" } });
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;
      let idDocUrl = null;
      if (photoFile) photoUrl = await uploadFile(photoFile, "photos");
      if (idDocFile) idDocUrl = await uploadFile(idDocFile, "id-documents");

      const { error } = await supabase.from("agent_applications").insert({
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        lga: "",
        role_type: "rider",
        id_type: formData.id_type,
        id_number: formData.id_number,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_name: formData.account_name,
        has_vehicle: formData.has_vehicle,
        vehicle_type: formData.vehicle_type,
        experience_description: formData.experience_description,
        market_knowledge: [],
        photo_url: photoUrl,
        id_document_url: idDocUrl,
      });

      if (error) throw error;

      toast({ title: "Application Submitted!", description: "We'll review your rider application within 48 hours." });
      setStep(4);
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  if (checkingApplication) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (existingApplication) {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Rider Application Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium capitalize ${statusColors[existingApplication.status]}`}>
                  {existingApplication.status.replace("_", " ")}
                </span>
                {existingApplication.status === "approved" && (
                  <Button onClick={() => navigate("/rider")}>Go to Rider Dashboard</Button>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="text-center">
              <CardContent className="pt-12 pb-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">Application Submitted!</h2>
                <p className="text-muted-foreground mb-8">We'll review your rider application within 48 hours.</p>
                <Button onClick={() => navigate("/")}>Return to Home</Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Bike className="w-6 h-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Rider Application</h1>
            </div>
            <p className="text-muted-foreground">Step {step} of {totalSteps}</p>
            <Progress value={progress} className="mt-4" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 && "Personal Information"}
                {step === 2 && "Identification & Banking"}
                {step === 3 && "Vehicle & Experience"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={formData.full_name} onChange={(e) => handleInputChange("full_name", e.target.value)} placeholder="Enter your full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} placeholder="08012345678" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth *</Label>
                      <Input type="date" value={formData.date_of_birth} onChange={(e) => handleInputChange("date_of_birth", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <RadioGroup value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="rmale" /><Label htmlFor="rmale">Male</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="rfemale" /><Label htmlFor="rfemale">Female</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Address *</Label>
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} placeholder="Street address" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Input value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select value={formData.state} onValueChange={(v) => handleInputChange("state", v)}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>{nigerianStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ID Type *</Label>
                      <Select value={formData.id_type} onValueChange={(v) => handleInputChange("id_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nin">NIN</SelectItem>
                          <SelectItem value="voters_card">Voter's Card</SelectItem>
                          <SelectItem value="drivers_license">Driver's License</SelectItem>
                          <SelectItem value="passport">International Passport</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>ID Number *</Label>
                      <Input value={formData.id_number} onChange={(e) => handleInputChange("id_number", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Document Upload</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => setIdDocFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank *</Label>
                    <Select value={formData.bank_name} onValueChange={(v) => handleInputChange("bank_name", v)}>
                      <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                      <SelectContent>{nigerianBanks.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Number *</Label>
                      <Input value={formData.account_number} onChange={(e) => handleInputChange("account_number", e.target.value)} maxLength={10} />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Name *</Label>
                      <Input value={formData.account_name} onChange={(e) => handleInputChange("account_name", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label>Vehicle Type *</Label>
                    <Select value={formData.vehicle_type} onValueChange={(v) => handleInputChange("vehicle_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="bicycle">Bicycle</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="tricycle">Tricycle (Keke)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Experience</Label>
                    <Textarea
                      value={formData.experience_description}
                      onChange={(e) => handleInputChange("experience_description", e.target.value)}
                      placeholder="Describe any prior delivery experience..."
                      rows={4}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                {step < totalSteps ? (
                  <Button onClick={() => setStep(step + 1)}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Application"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RiderApplication;
