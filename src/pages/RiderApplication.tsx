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
  password: string;
  confirmPassword: string;
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
  const [isNewSignup, setIsNewSignup] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    password: "",
    confirmPassword: "",
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
    setErrors((prev) => { const next = { ...prev }; delete next[field as string]; return next; });
  };

  const validateStep = (currentStep: number): boolean => {
    const e: Record<string, string> = {};
    if (currentStep === 1) {
      const nameParts = formData.full_name.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) e.full_name = "Enter your first and last name";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Enter a valid email address";
      if (!/^(\+234|0)[789]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) e.phone = "Enter a valid Nigerian phone number (e.g. 08012345678)";
      if (!formData.date_of_birth) {
        e.date_of_birth = "Date of birth is required";
      } else {
        const ageMins = Date.now() - new Date(formData.date_of_birth).getTime();
        if (ageMins / (1000 * 60 * 60 * 24 * 365.25) < 18) e.date_of_birth = "You must be at least 18 years old";
      }
      if (!formData.gender) e.gender = "Please select your gender";
      if (!formData.address.trim() || formData.address.trim().length < 5) e.address = "Enter your full street address";
      if (!formData.city.trim()) e.city = "City is required";
      if (!formData.state) e.state = "Please select your state";
      if (!user) {
        if (formData.password.length < 6) e.password = "Password must be at least 6 characters";
        else if (formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords do not match";
      }
    }
    if (currentStep === 2) {
      if (!formData.id_type) e.id_type = "Please select an ID type";
      if (formData.id_number.trim().length < 5) e.id_number = "Enter a valid ID number";
      if (!formData.bank_name) e.bank_name = "Please select your bank";
      if (!/^\d{10}$/.test(formData.account_number)) e.account_number = "Account number must be exactly 10 digits";
      if (!formData.account_name.trim()) e.account_name = "Account name is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${folder}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("agent-documents").upload(fileName, file);
    if (error) return null;
    return fileName;
  };

  const uploadFilePending = async (file: File, userId: string, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `temp/${userId}/${folder}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("agent-documents").upload(fileName, file);
    if (error) { console.error("Pending upload error:", error); return null; }
    return fileName;
  };

  const handleSubmit = async () => {
    let currentUser = user;

    // ── NEW USER: create account first ──────────────────────────────────────
    if (!currentUser) {
      if (!formData.password || formData.password.length < 6) {
        toast({ title: "Password Required", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "Passwords Don't Match", description: "Please confirm your password.", variant: "destructive" });
        return;
      }

      setLoading(true);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: "https://shop4meng.com/auth",
          data: { full_name: formData.full_name, role: "delivery_rider" },
        },
      });

      if (signUpError) {
        toast({ title: "Sign Up Failed", description: signUpError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const newUser = signUpData.user;
      if (!newUser) {
        toast({ title: "Sign Up Failed", description: "Could not create account. Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Email confirmation required — upload files to temp/ then insert via SECURITY DEFINER RPC
      if (!signUpData.session) {
        setIsNewSignup(true);
        try {
          const photoUrl = photoFile ? await uploadFilePending(photoFile, newUser.id, "photos") : null;
          const idDocUrl = idDocFile ? await uploadFilePending(idDocFile, newUser.id, "id-documents") : null;

          const baseRpcParams = {
            p_user_id: newUser.id,
            p_email: formData.email,
            p_full_name: formData.full_name,
            p_phone: formData.phone,
            p_date_of_birth: formData.date_of_birth,
            p_gender: formData.gender,
            p_address: formData.address,
            p_city: formData.city,
            p_state: formData.state,
            p_lga: "",
            p_role_type: "delivery_rider",
            p_id_type: formData.id_type,
            p_id_number: formData.id_number,
            p_bank_name: formData.bank_name,
            p_account_number: formData.account_number,
            p_account_name: formData.account_name,
            p_has_smartphone: true,
            p_has_vehicle: formData.has_vehicle,
            p_vehicle_type: formData.vehicle_type || null,
            p_market_knowledge: [],
            p_experience_description: formData.experience_description || null,
            p_how_heard_about_us: null,
            p_business_type: "individual",
            p_business_name: null,
            p_business_address: null,
          };
          let { error: rpcError } = await supabase.rpc("submit_agent_application", {
            ...baseRpcParams,
            p_photo_url: photoUrl,
            p_id_document_url: idDocUrl,
          });
          // Fall back to the v1 signature if the DB hasn't been migrated yet
          if (rpcError && rpcError.message?.includes("Could not find the function")) {
            const fallback = await supabase.rpc("submit_agent_application", baseRpcParams);
            rpcError = fallback.error;
          }
          if (rpcError) throw rpcError;
        } catch (err: any) {
          toast({ title: "Submission Failed", description: err.message || "Please try again.", variant: "destructive" });
          setLoading(false);
          return;
        }
        setLoading(false);
        setStep(4);
        return;
      }

      // No email confirmation required — session is live
      currentUser = signUpData.user;
      await supabase.from("profiles").update({ full_name: formData.full_name, phone: formData.phone }).eq("user_id", currentUser!.id);
    }

    if (!currentUser) {
      toast({ title: "Error", description: "Could not create account.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // ── AUTHENTICATED PATH: upload files and insert ──────────────────────────
    setLoading(true);
    try {
      let photoUrl: string | null = null;
      let idDocUrl: string | null = null;
      if (photoFile) photoUrl = await uploadFile(photoFile, "photos");
      if (idDocFile) idDocUrl = await uploadFile(idDocFile, "id-documents");

      const { error } = await supabase.from("agent_applications").insert({
        user_id: currentUser.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        lga: "",
        role_type: "delivery_rider",
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

      await supabase.from("profiles").update({ full_name: formData.full_name, phone: formData.phone }).eq("user_id", currentUser.id);

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
            <Card>
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">Application Submitted!</h2>
                <p className="text-muted-foreground text-center mb-8">Thank you for applying to join Shop4Me as a rider.</p>
                <div className="bg-muted/50 rounded-xl p-6 mb-6 space-y-5">
                  <h3 className="font-semibold text-foreground text-base">What happens next</h3>
                  {isNewSignup && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                      <div>
                        <p className="font-medium text-foreground text-sm">Confirm your email</p>
                        <p className="text-muted-foreground text-sm mt-0.5">
                          We sent a verification link to <span className="font-medium text-foreground">{formData.email}</span>. Open it to activate your account.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{isNewSignup ? "2" : "1"}</div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Application review (within 48 hours)</p>
                      <p className="text-muted-foreground text-sm mt-0.5">Our team will review your details and documents.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{isNewSignup ? "3" : "2"}</div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Access your rider dashboard</p>
                      <p className="text-muted-foreground text-sm mt-0.5">Once approved, log in to start accepting deliveries.</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {isNewSignup ? (
                    <Button className="flex-1" onClick={() => navigate("/auth")}>Go to Login</Button>
                  ) : (
                    <Button className="flex-1" onClick={() => navigate("/rider")}>Go to Rider Dashboard</Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Return to Home</Button>
                </div>
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
                      <Input value={formData.full_name} onChange={(e) => handleInputChange("full_name", e.target.value)} placeholder="First and last name" className={errors.full_name ? "border-destructive" : ""} />
                      {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} className={errors.email ? "border-destructive" : ""} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} placeholder="08012345678" className={errors.phone ? "border-destructive" : ""} />
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth *</Label>
                      <Input type="date" value={formData.date_of_birth} onChange={(e) => handleInputChange("date_of_birth", e.target.value)} className={errors.date_of_birth ? "border-destructive" : ""} max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} />
                      {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <RadioGroup value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="rmale" /><Label htmlFor="rmale">Male</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="rfemale" /><Label htmlFor="rfemale">Female</Label></div>
                    </RadioGroup>
                    {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Address *</Label>
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} placeholder="Street address" className={errors.address ? "border-destructive" : ""} />
                    {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Input value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} className={errors.city ? "border-destructive" : ""} />
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select value={formData.state} onValueChange={(v) => handleInputChange("state", v)}>
                        <SelectTrigger className={errors.state ? "border-destructive" : ""}><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>{nigerianStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                  </div>
                  {!user && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3 text-foreground">Create Your Account</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Password *</Label>
                          <Input type="password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="Min. 6 characters" className={errors.password ? "border-destructive" : ""} />
                          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Confirm Password *</Label>
                          <Input type="password" value={formData.confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} placeholder="Re-enter password" className={errors.confirmPassword ? "border-destructive" : ""} />
                          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ID Type *</Label>
                      <Select value={formData.id_type} onValueChange={(v) => handleInputChange("id_type", v)}>
                        <SelectTrigger className={errors.id_type ? "border-destructive" : ""}><SelectValue placeholder="Select ID type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nin">NIN</SelectItem>
                          <SelectItem value="voters_card">Voter's Card</SelectItem>
                          <SelectItem value="drivers_license">Driver's License</SelectItem>
                          <SelectItem value="passport">International Passport</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.id_type && <p className="text-xs text-destructive">{errors.id_type}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>ID Number *</Label>
                      <Input value={formData.id_number} onChange={(e) => handleInputChange("id_number", e.target.value)} className={errors.id_number ? "border-destructive" : ""} />
                      {errors.id_number && <p className="text-xs text-destructive">{errors.id_number}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Document Upload</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => setIdDocFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank *</Label>
                    <Select value={formData.bank_name} onValueChange={(v) => handleInputChange("bank_name", v)}>
                      <SelectTrigger className={errors.bank_name ? "border-destructive" : ""}><SelectValue placeholder="Select bank" /></SelectTrigger>
                      <SelectContent>{nigerianBanks.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                    {errors.bank_name && <p className="text-xs text-destructive">{errors.bank_name}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Number *</Label>
                      <Input value={formData.account_number} onChange={(e) => handleInputChange("account_number", e.target.value.replace(/\D/g, ""))} maxLength={10} inputMode="numeric" className={errors.account_number ? "border-destructive" : ""} />
                      {errors.account_number && <p className="text-xs text-destructive">{errors.account_number}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Account Name *</Label>
                      <Input value={formData.account_name} onChange={(e) => handleInputChange("account_name", e.target.value)} className={errors.account_name ? "border-destructive" : ""} />
                      {errors.account_name && <p className="text-xs text-destructive">{errors.account_name}</p>}
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
                  <Button onClick={() => { if (validateStep(step)) setStep(step + 1); }}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={() => { if (validateStep(step)) handleSubmit(); }} disabled={loading}>
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
