import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, UserCog, Ban, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  role: AppRole;
  is_suspended: boolean;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Role change dialog
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("buyer");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Suspend state
  const [suspending, setSuspending] = useState<string | null>(null);

  // Delete confirmation
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || "buyer",
          is_suspended: (profile as any).is_suspended ?? false,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setUpdatingRole(true);
    try {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.user_id);
      if (deleteError) throw deleteError;

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: selectedUser.user_id, role: newRole });
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => u.user_id === selectedUser.user_id ? { ...u, role: newRole } : u)
      );
      toast({ title: "Success", description: `Role updated to ${newRole}` });
      setIsRoleDialogOpen(false);
    } catch (error) {
      console.error("Error updating role:", error);
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleSuspend = async (user: UserWithRole) => {
    setSuspending(user.user_id);
    try {
      const { error } = await supabase.rpc("admin_set_user_suspended", {
        p_user_id: user.user_id,
        p_suspended: !user.is_suspended,
      });
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => u.user_id === user.user_id ? { ...u, is_suspended: !u.is_suspended } : u)
      );
      toast({
        title: user.is_suspended ? "User unsuspended" : "User suspended",
        description: user.is_suspended
          ? `${user.full_name || user.email} can now access the platform.`
          : `${user.full_name || user.email} has been blocked from the platform.`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update suspension", variant: "destructive" });
    } finally {
      setSuspending(null);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: userToDelete.user_id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.user_id !== userToDelete.user_id));
      toast({ title: "User deleted", description: `${userToDelete.full_name || userToDelete.email} has been permanently deleted.` });
      setUserToDelete(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const openRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case "admin":   return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "agent":   return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "rider":   return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">View and manage all platform users.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="buyer">Buyers</SelectItem>
                  <SelectItem value="agent">Agents</SelectItem>
                  <SelectItem value="rider">Riders</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No users found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className={user.is_suspended ? "opacity-60" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.is_suspended ? (
                            <Badge variant="destructive" className="text-xs">Suspended</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRoleDialog(user)}
                              title="Change role"
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuspend(user)}
                              disabled={suspending === user.user_id || user.role === "admin"}
                              title={user.is_suspended ? "Unsuspend user" : "Suspend user"}
                              className={user.is_suspended ? "text-green-600 hover:text-green-700" : "text-amber-600 hover:text-amber-700"}
                            >
                              {suspending === user.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.is_suspended ? (
                                <ShieldCheck className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(user)}
                              disabled={user.role === "admin"}
                              title="Delete user permanently"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="rider">Rider</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={updatingRole}>
              {updatingRole ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong> and all
              their data (orders, profile, messages). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
};

export default AdminUsers;
