import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, CheckCircle, XCircle, UserX, Trash2, Loader2 } from "lucide-react";

type ApplicationStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";

interface AgentApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string | null;
  address: string;
  city: string;
  state: string;
  lga: string | null;
  role_type: string;
  id_type: string;
  id_number: string;
  id_document_url: string | null;
  bank_name: string;
  account_number: string;
  account_name: string;
  has_smartphone: boolean;
  has_vehicle: boolean;
  vehicle_type: string | null;
  market_knowledge: string[];
  experience_description: string | null;
  how_heard_about_us: string | null;
  photo_url: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const AdminApplications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<AgentApplication | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications((data as AgentApplication[]) || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: AgentApplication) => {
    setProcessing(true);
    try {
      // Atomic approval via SECURITY DEFINER RPC — updates application + role in one call
      const { error: rpcError } = await (supabase as any).rpc("approve_application", {
        p_application_id: app.id,
        p_admin_notes: adminNotes || null,
      });

      if (rpcError) {
        // Fallback for environments where the RPC migration hasn't been applied yet
        const { error: appError } = await supabase
          .from("agent_applications")
          .update({
            status: "approved",
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
            admin_notes: adminNotes || null,
          })
          .eq("id", app.id);
        if (appError) throw appError;

        const targetRole = (app.role_type === "rider" || app.role_type === "delivery_rider") ? "rider" : "agent";
        const { data: updated, error: updateError } = await supabase
          .from("user_roles")
          .update({ role: targetRole })
          .eq("user_id", app.user_id)
          .eq("role", "buyer")
          .select("id");
        if (updateError) throw updateError;

        if (!updated || updated.length === 0) {
          const { error: insertError } = await supabase
            .from("user_roles")
            .insert({ user_id: app.user_id, role: targetRole });
          if (insertError && insertError.code !== "23505") throw insertError;
        }
      }

      // Update local state
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: "approved" as ApplicationStatus } : a))
      );

      const isRider = app.role_type === "rider" || app.role_type === "delivery_rider";
      const roleLabel = isRider ? "rider" : "agent";

      // Send approval email (fire-and-forget)
      if (isRider) {
        supabase.functions.invoke("send-notification-email", {
          body: { type: "rider_approved", data: { email: app.email, name: app.full_name } },
        }).catch((err) => console.error("Rider approval email failed:", err));
      } else {
        supabase
          .from("store_agents")
          .select("store:stores(name, branch_name, parent_brand)")
          .eq("agent_id", app.user_id)
          .then(({ data: storeData }) => {
            const stores = (storeData || []).map((sa: any) => sa.store).filter(Boolean);
            supabase.functions.invoke("send-notification-email", {
              body: { type: "agent_approved", data: { email: app.email, name: app.full_name, stores } },
            }).catch((err) => console.error("Agent approval email failed:", err));
          });
      }

      toast({
        title: "Application Approved",
        description: `${app.full_name} has been approved as a ${roleLabel}. They must log out and log back in to access the ${roleLabel} dashboard.`,
      });

      setIsViewOpen(false);
      setAdminNotes("");
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "Error",
        description: "Failed to approve application",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((a) => (a.id === selectedApp.id ? { ...a, status: "rejected" as ApplicationStatus } : a))
      );

      toast({
        title: "Application Rejected",
        description: `${selectedApp.full_name}'s application has been rejected.`,
      });

      setIsRejectOpen(false);
      setIsViewOpen(false);
      setRejectionReason("");
      setAdminNotes("");
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async (app: AgentApplication) => {
    setProcessing(true);
    try {
      // Update application status
      const { error: appError } = await supabase
        .from("agent_applications")
        .update({ status: "suspended" })
        .eq("id", app.id);

      if (appError) throw appError;

      // Revert role: update agent/rider row back to buyer
      const { data: reverted, error: revertError } = await supabase
        .from("user_roles")
        .update({ role: "buyer" })
        .eq("user_id", app.user_id)
        .in("role", ["agent", "rider"])
        .select("id");

      if (revertError) throw revertError;

      if (!reverted || reverted.length === 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: app.user_id, role: "buyer" });
        if (insertError && insertError.code !== "23505") throw insertError;
      }

      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: "suspended" as ApplicationStatus } : a))
      );

      toast({
        title: "Agent Suspended",
        description: `${app.full_name} has been suspended.`,
      });

      setIsViewOpen(false);
    } catch (error) {
      console.error("Error suspending agent:", error);
      toast({
        title: "Error",
        description: "Failed to suspend agent",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedApp) return;

    setProcessing(true);
    try {
      // Delete application
      const { error: appError } = await supabase
        .from("agent_applications")
        .delete()
        .eq("id", selectedApp.id);

      if (appError) throw appError;

      await supabase
        .from("user_roles")
        .update({ role: "buyer" })
        .eq("user_id", selectedApp.user_id)
        .in("role", ["agent", "rider"]);

      setApplications((prev) => prev.filter((a) => a.id !== selectedApp.id));

      toast({
        title: "Application Deleted",
        description: "The application has been permanently deleted.",
      });

      setIsDeleteOpen(false);
      setIsViewOpen(false);
    } catch (error) {
      console.error("Error deleting application:", error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openViewDialog = async (app: AgentApplication) => {
    setSelectedApp(app);
    setAdminNotes(app.admin_notes || "");
    setSignedDocUrl(null);
    setSignedPhotoUrl(null);
    setIsViewOpen(true);

    // Generate signed URLs for private documents
    if (app.id_document_url) {
      const { data } = await supabase.storage
        .from("agent-documents")
        .createSignedUrl(app.id_document_url, 3600); // 1 hour expiry
      if (data?.signedUrl) {
        setSignedDocUrl(data.signedUrl);
      }
    }

    if (app.photo_url) {
      const { data } = await supabase.storage
        .from("agent-documents")
        .createSignedUrl(app.photo_url, 3600);
      if (data?.signedUrl) {
        setSignedPhotoUrl(data.signedUrl);
      }
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery);

    const matchesStatus = statusFilter === "all" || app.status === statusFilter;

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "agent" && ["shopping_agent", "both"].includes(app.role_type)) ||
      (roleFilter === "rider" && ["rider", "delivery_rider"].includes(app.role_type));

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    const colors: Record<ApplicationStatus, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agent Applications</h1>
          <p className="text-muted-foreground">Review and manage agent applications.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Applications</CardTitle>
            <CardDescription>
              {filteredApplications.length} application{filteredApplications.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Role type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="agent">Agents</SelectItem>
                  <SelectItem value="rider">Riders</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No applications found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.full_name}</p>
                            <p className="text-sm text-muted-foreground">{app.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {app.role_type.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          {app.city}, {app.state}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(app.status)}>
                            {app.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(app.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openViewDialog(app)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Application Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedApp && (
              <>
                <DialogHeader>
                  <DialogTitle>Application Details</DialogTitle>
                  <DialogDescription>
                    Submitted on {new Date(selectedApp.created_at).toLocaleDateString()}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Profile photo */}
                  {selectedApp.photo_url && (
                    <div>
                      <h4 className="font-medium mb-3">Profile Photo</h4>
                      {signedPhotoUrl ? (
                        <img
                          src={signedPhotoUrl}
                          alt="Applicant photo"
                          className="w-24 h-24 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Personal Info */}
                  <div>
                    <h4 className="font-medium mb-3">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 rounded-lg p-4">
                      <div>
                        <p className="text-muted-foreground">Full Name</p>
                        <p className="font-medium">{selectedApp.full_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedApp.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedApp.phone}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{selectedApp.date_of_birth}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{selectedApp.gender || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Role</p>
                        <p className="font-medium capitalize">{selectedApp.role_type.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h4 className="font-medium mb-3">Address</h4>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      <p>{selectedApp.address}</p>
                      <p>{selectedApp.city}, {selectedApp.state}</p>
                      {selectedApp.lga && <p>LGA: {selectedApp.lga}</p>}
                    </div>
                  </div>

                  {/* Identification */}
                  <div>
                    <h4 className="font-medium mb-3">Identification</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 rounded-lg p-4">
                      <div>
                        <p className="text-muted-foreground">ID Type</p>
                        <p className="font-medium capitalize">{selectedApp.id_type.replace("_", " ")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ID Number</p>
                        <p className="font-medium">{selectedApp.id_number}</p>
                      </div>
                    </div>
                    {selectedApp.id_document_url && (
                      signedDocUrl ? (
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <a href={signedDocUrl} target="_blank" rel="noopener noreferrer">
                            View ID Document
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="mt-2" disabled>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading Document...
                        </Button>
                      )
                    )}
                  </div>

                  {/* Banking */}
                  <div>
                    <h4 className="font-medium mb-3">Bank Details</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm bg-muted/50 rounded-lg p-4">
                      <div>
                        <p className="text-muted-foreground">Bank</p>
                        <p className="font-medium">{selectedApp.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Account Number</p>
                        <p className="font-medium">{selectedApp.account_number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Account Name</p>
                        <p className="font-medium">{selectedApp.account_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <h4 className="font-medium mb-3">Experience & Skills</h4>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
                      <div>
                        <p className="text-muted-foreground">Has Smartphone</p>
                        <p className="font-medium">{selectedApp.has_smartphone ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Has Vehicle</p>
                        <p className="font-medium">
                          {selectedApp.has_vehicle ? `Yes - ${selectedApp.vehicle_type}` : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Markets Known</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedApp.market_knowledge.map((m) => (
                            <Badge key={m} variant="secondary" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {selectedApp.experience_description && (
                        <div>
                          <p className="text-muted-foreground">Experience</p>
                          <p>{selectedApp.experience_description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <h4 className="font-medium mb-3">Admin Notes</h4>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this application..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  {selectedApp.status === "pending" || selectedApp.status === "under_review" ? (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => setIsRejectOpen(true)}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedApp)}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Approve
                      </Button>
                    </>
                  ) : selectedApp.status === "approved" ? (
                    <Button
                      variant="destructive"
                      onClick={() => handleSuspend(selectedApp)}
                      disabled={processing}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Suspend Agent
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedApp(selectedApp);
                      setIsDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejection. This will be shown to the applicant.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processing}
              >
                {processing ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Application</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the application
                and remove the agent role from this user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {processing ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminApplications;
