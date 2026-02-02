import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  Package,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  User,
  MessageSquare,
} from "lucide-react";
import DashboardHeaderNav from "./DashboardHeaderNav";
import DashboardFooter from "./DashboardFooter";

interface AgentDashboardLayoutProps {
  children: React.ReactNode;
}

const AgentDashboardLayout = ({ children }: AgentDashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/agent", label: "Dashboard", icon: Home },
    { href: "/agent/available-orders", label: "Available Orders", icon: Package },
    { href: "/agent/my-orders", label: "My Orders", icon: ShoppingCart },
    { href: "/agent/messages", label: "Messages", icon: MessageSquare },
    { href: "/agent/earnings", label: "Earnings", icon: Wallet },
    { href: "/agent/settings", label: "Settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const NavContent = () => (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-primary">Shop4Me</span>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">Agent</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-8">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b border-border">
                <Link to="/" className="flex items-center gap-2">
                  <span className="text-2xl font-display font-bold text-primary">Shop4Me</span>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">Agent</span>
                </Link>
              </div>
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <DashboardHeaderNav variant="agent" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.email?.charAt(0).toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-sm">
                  {user?.email?.split("@")[0]}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/agent/settings" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="flex items-center">
                  <Package className="mr-2 h-4 w-4" />
                  Switch to Buyer
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 flex-1">{children}</main>

        {/* Footer */}
        <DashboardFooter />
      </div>
      
      {/* Push Notification Prompt */}
      <PushNotificationPrompt />
    </div>
  );
};

export default AgentDashboardLayout;
