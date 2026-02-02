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
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Loader2 } from "lucide-react";

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

const marketOptions = [
  "Balogun Market", "Computer Village", "Alaba International", "Trade Fair Complex",
  "Ladipo Market", "Idumota Market", "Tejuosho Market", "Yaba Market", "Ojuelegba Market",
  "Mile 12 Market", "Oyingbo Market", "Arena Market", "Ikeja City Mall", "The Palms",
  "Lekki Mall", "Adeniran Ogunsanya Mall", "Festival Mall", "Jabi Lake Mall", "Shoprite",
  "Other Markets"
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
  lga: string;
  role_type: string;
  id_type: string;
  id_number: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  has_smartphone: boolean;
  has_vehicle: boolean;
  vehicle_type: string;
  market_knowledge: string[];
  experience_description: string;
  how_heard_about_us: string;
}

const AgentApplication = () => {
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
    lga: "",
    role_type: "shopping_agent",
    id_type: "",
    id_number: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    has_smartphone: true,
    has_vehicle: false,
    vehicle_type: "none",
    market_knowledge: [],
    experience_description: "",
    how_heard_about_us: "",
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
      const { data, error } = await supabase
        .from("agent_applications")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (data) {
        setExistingApplication(data);
      }
    } catch (error) {
      console.error("Error checking application:", error);
    } finally {
      setCheckingApplication(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMarketToggle = (market: string) => {
    setFormData((prev) => ({
      ...prev,
      market_knowledge: prev.market_knowledge.includes(market)
        ? prev.market_knowledge.filter((m) => m !== market)
        : [...prev.market_knowledge, market],
    }));
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${folder}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("agent-documents")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    // Return just the file path - the bucket is private so we'll generate signed URLs when viewing
    return fileName;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit your application.",
        variant: "destructive",
      });
      navigate("/auth", { state: { from: "/agent-application" } });
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;
      let idDocUrl = null;

      if (photoFile) {
        photoUrl = await uploadFile(photoFile, "photos");
      }

      if (idDocFile) {
        idDocUrl = await uploadFile(idDocFile, "id-documents");
      }

      const { error } = await supabase.from("agent_applications").insert({
        user_id: user.id,
        ...formData,
        photo_url: photoUrl,
        id_document_url: idDocUrl,
      });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you within 48 hours.",
      });

      setStep(5); // Success step
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.full_name && formData.email && formData.phone && formData.date_of_birth && formData.gender;
      case 2:
        return formData.address && formData.city && formData.state && formData.role_type;
      case 3:
        return formData.id_type && formData.id_number && formData.bank_name && formData.account_number && formData.account_name;
      case 4:
        return formData.market_knowledge.length > 0;
      default:
        return true;
    }
  };

  if (checkingApplication) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (existingApplication) {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      suspended: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Application Status</CardTitle>
                <CardDescription>Your application has been submitted</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium capitalize ${statusColors[existingApplication.status]}`}>
                    {existingApplication.status.replace("_", " ")}
                  </span>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p><strong>Name:</strong> {existingApplication.full_name}</p>
                  <p><strong>Role:</strong> {existingApplication.role_type.replace("_", " ")}</p>
                  <p><strong>Submitted:</strong> {new Date(existingApplication.created_at).toLocaleDateString()}</p>
                </div>

                {existingApplication.status === "rejected" && existingApplication.rejection_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="font-medium text-destructive">Rejection Reason:</p>
                    <p className="text-sm text-muted-foreground">{existingApplication.rejection_reason}</p>
                  </div>
                )}

                {existingApplication.status === "approved" && (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Congratulations! Your application has been approved. You can now access the agent dashboard.
                    </p>
                    <Button onClick={() => navigate("/agent")}>
                      Go to Agent Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="text-center">
              <CardContent className="pt-12 pb-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  Application Submitted!
                </h2>
                <p className="text-muted-foreground mb-8">
                  Thank you for applying to become a Shop4Me agent. We'll review your application
                  and get back to you within 48 hours.
                </p>
                <Button onClick={() => navigate("/")}>
                  Return to Home
                </Button>
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
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Agent Application
            </h1>
            <p className="text-muted-foreground">Step {step} of {totalSteps}</p>
            <Progress value={progress} className="mt-4" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 && "Personal Information"}
                {step === 2 && "Address & Role"}
                {step === 3 && "Identification & Banking"}
                {step === 4 && "Experience & Skills"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange("full_name", e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="08012345678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <RadioGroup
                      value={formData.gender}
                      onValueChange={(v) => handleInputChange("gender", v)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {photoFile && (
                        <span className="text-sm text-green-600">✓ Selected</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Address & Role */}
              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Enter your street address"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        placeholder="e.g., Lagos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select value={formData.state} onValueChange={(v) => handleInputChange("state", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {nigerianStates.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lga">Local Government Area</Label>
                    <Input
                      id="lga"
                      value={formData.lga}
                      onChange={(e) => handleInputChange("lga", e.target.value)}
                      placeholder="e.g., Ikeja"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Role *</Label>
                    <RadioGroup
                      value={formData.role_type}
                      onValueChange={(v) => handleInputChange("role_type", v)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="shopping_agent" id="shopping" />
                        <Label htmlFor="shopping">Shopping Agent - Source products from markets/malls</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="delivery_rider" id="delivery" />
                        <Label htmlFor="delivery">Delivery Rider - Deliver items to customers</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both">Both - I can do shopping and delivery</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}

              {/* Step 3: ID & Banking */}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label>ID Type *</Label>
                    <Select value={formData.id_type} onValueChange={(v) => handleInputChange("id_type", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nin">National ID (NIN)</SelectItem>
                        <SelectItem value="voters_card">Voter's Card</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                        <SelectItem value="passport">International Passport</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_number">ID Number *</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) => handleInputChange("id_number", e.target.value)}
                      placeholder="Enter your ID number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Upload ID Document</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setIdDocFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {idDocFile && (
                        <span className="text-sm text-green-600">✓ Selected</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t pt-6 mt-6">
                    <h4 className="font-medium mb-4">Bank Account Details</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Bank Name *</Label>
                        <Select value={formData.bank_name} onValueChange={(v) => handleInputChange("bank_name", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {nigerianBanks.map((bank) => (
                              <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="account_number">Account Number *</Label>
                          <Input
                            id="account_number"
                            value={formData.account_number}
                            onChange={(e) => handleInputChange("account_number", e.target.value)}
                            placeholder="10-digit account number"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="account_name">Account Name *</Label>
                          <Input
                            id="account_name"
                            value={formData.account_name}
                            onChange={(e) => handleInputChange("account_name", e.target.value)}
                            placeholder="Name on account"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Experience */}
              {step === 4 && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smartphone"
                        checked={formData.has_smartphone}
                        onCheckedChange={(c) => handleInputChange("has_smartphone", c)}
                      />
                      <Label htmlFor="smartphone">I have a smartphone with data connection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="vehicle"
                        checked={formData.has_vehicle}
                        onCheckedChange={(c) => handleInputChange("has_vehicle", c)}
                      />
                      <Label htmlFor="vehicle">I have a vehicle for delivery</Label>
                    </div>
                    {formData.has_vehicle && (
                      <div className="ml-6 space-y-2">
                        <Label>Vehicle Type</Label>
                        <RadioGroup
                          value={formData.vehicle_type}
                          onValueChange={(v) => handleInputChange("vehicle_type", v)}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="motorcycle" id="motorcycle" />
                            <Label htmlFor="motorcycle">Motorcycle</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bicycle" id="bicycle" />
                            <Label htmlFor="bicycle">Bicycle</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="car" id="car" />
                            <Label htmlFor="car">Car</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Markets/Malls You Know Well * (Select at least one)</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                      {marketOptions.map((market) => (
                        <div key={market} className="flex items-center space-x-2">
                          <Checkbox
                            id={market}
                            checked={formData.market_knowledge.includes(market)}
                            onCheckedChange={() => handleMarketToggle(market)}
                          />
                          <Label htmlFor={market} className="text-sm">{market}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Previous Experience (Optional)</Label>
                    <Textarea
                      id="experience"
                      value={formData.experience_description}
                      onChange={(e) => handleInputChange("experience_description", e.target.value)}
                      placeholder="Tell us about any relevant experience..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>How did you hear about us?</Label>
                    <Select value={formData.how_heard_about_us} onValueChange={(v) => handleInputChange("how_heard_about_us", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="friend">Friend/Family</SelectItem>
                        <SelectItem value="advertisement">Advertisement</SelectItem>
                        <SelectItem value="search">Online Search</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={step === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                {step < 4 ? (
                  <Button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canProceed()}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading || !canProceed()}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </>
                    )}
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

export default AgentApplication;
