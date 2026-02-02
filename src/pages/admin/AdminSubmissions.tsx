import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { Mail, MessageSquare, Eye, Users, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ContactSubmission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  responded_at: string | null;
}

interface NewsletterSubscription {
  id: string;
  email: string;
  full_name: string | null;
  subscribed_at: string;
  is_active: boolean;
  unsubscribed_at: string | null;
}

const AdminSubmissions = () => {
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Fetch contact submissions
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContactSubmission[];
    },
  });

  // Fetch newsletter subscriptions
  const { data: subscribers, isLoading: subscribersLoading } = useQuery({
    queryKey: ["admin-newsletter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscriptions")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (error) throw error;
      return data as NewsletterSubscription[];
    },
  });

  // Update contact submission
  const updateContactMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status: string;
      admin_notes: string;
    }) => {
      const updateData: Partial<ContactSubmission> = {
        status,
        admin_notes,
      };

      if (status === "responded") {
        updateData.responded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("contact_submissions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
      toast.success("Contact submission updated");
      setSelectedContact(null);
    },
    onError: () => {
      toast.error("Failed to update submission");
    },
  });

  const handleUpdateContact = () => {
    if (!selectedContact) return;

    updateContactMutation.mutate({
      id: selectedContact.id,
      status: newStatus || selectedContact.status,
      admin_notes: adminNotes,
    });
  };

  const openContactDetails = (contact: ContactSubmission) => {
    setSelectedContact(contact);
    setAdminNotes(contact.admin_notes || "");
    setNewStatus(contact.status);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      new: "default",
      in_progress: "secondary",
      responded: "outline",
      closed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const newContactsCount = contacts?.filter((c) => c.status === "new").length || 0;
  const activeSubscribersCount = subscribers?.filter((s) => s.is_active).length || 0;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Submissions
          </h1>
          <p className="text-muted-foreground">
            Manage contact form submissions and newsletter subscriptions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{newContactsCount}</p>
                <p className="text-sm text-muted-foreground">New Messages</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subscribers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSubscribersCount}</p>
                <p className="text-sm text-muted-foreground">Active Subscribers</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="contacts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="contacts" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Contact Submissions
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="gap-2">
              <Mail className="w-4 h-4" />
              Newsletter Subscribers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : contacts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No contact submissions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    contacts?.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="text-sm">
                          {format(new Date(contact.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </TableCell>
                        <TableCell className="text-sm">{contact.email}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {contact.subject}
                        </TableCell>
                        <TableCell>{getStatusBadge(contact.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openContactDetails(contact)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="newsletter">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : subscribers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No newsletter subscribers yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscribers?.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell className="text-sm">
                          {format(new Date(subscriber.subscribed_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {subscriber.full_name || "-"}
                        </TableCell>
                        <TableCell className="text-sm">{subscriber.email}</TableCell>
                        <TableCell>
                          <Badge variant={subscriber.is_active ? "default" : "destructive"}>
                            {subscriber.is_active ? "Active" : "Unsubscribed"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Details Dialog */}
        <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contact Submission Details</DialogTitle>
            </DialogHeader>
            {selectedContact && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedContact.first_name} {selectedContact.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedContact.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedContact.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {format(new Date(selectedContact.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Subject</p>
                  <p className="font-medium">{selectedContact.subject}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Message</p>
                  <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap">
                    {selectedContact.message}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="responded">Responded</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this submission..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setSelectedContact(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateContact}
                      disabled={updateContactMutation.isPending}
                    >
                      {updateContactMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSubmissions;
