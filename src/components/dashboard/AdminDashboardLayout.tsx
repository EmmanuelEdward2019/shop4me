import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingBag,
  LayoutDashboard,
  Users,
  Package,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Orders", href: "/admin/orders", icon: Package },
  { label: "Agents", href: "/admin/agents", icon: UserCheck },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminDashboardLayout = ({ children }: AdminDashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-16 flex items-center px-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-foreground"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <Link to="/admin" className="flex items-center gap-2 ml-4">
          <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center">
            <Shield className="w-4 h-4 text-destructive-foreground" />
          </div>
          <span className="text-lg font-display font-bold">
            Admin<span className="text-destructive">Panel</span>
          </span>
        </Link>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-destructive text-destructive-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-background border-r border-border transform transition-transform duration-200 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-destructive flex items-center justify-center">
              <Shield className="w-5 h-5 text-destructive-foreground" />
            </div>
            <span className="text-xl font-display font-bold">
              Admin<span className="text-destructive">Panel</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to Home */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-border bg-background">
          <h1 className="text-lg font-display font-semibold text-foreground">
            {navItems.find((item) => item.href === location.pathname)?.label || "Admin Dashboard"}
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-destructive text-destructive-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminDashboardLayout;
