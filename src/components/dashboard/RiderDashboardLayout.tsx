import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
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
  Bike,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  User,
  Wallet,
} from "lucide-react";
import logo from "@/assets/logo.png";
import DashboardHeaderNav from "./DashboardHeaderNav";
import DashboardFooter from "./DashboardFooter";

interface RiderDashboardLayoutProps {
  children: React.ReactNode;
}

const RiderDashboardLayout = ({ children }: RiderDashboardLayoutProps) => {
  const { signOut } = useAuth();
  const { getSurname, getInitials } = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/rider", label: "Dashboard", icon: Home },
    { href: "/rider/available-pickups", label: "Available Pickups", icon: Package },
    { href: "/rider/my-deliveries", label: "My Deliveries", icon: Bike },
    { href: "/rider/earnings", label: "Earnings", icon: Wallet },
    { href: "/rider/settings", label: "Settings", icon: Settings },
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
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Shop4Me" className="h-9" />
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Rider</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>
      </aside>

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b border-border">
                <Link to="/" className="flex items-center gap-2">
                  <img src={logo} alt="Shop4Me" className="h-9" />
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Rider</span>
                </Link>
              </div>
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <DashboardHeaderNav variant="agent" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-sm">
                  {getSurname()}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/rider/settings" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
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

        <main className="p-4 lg:p-8 flex-1">{children}</main>
        <DashboardFooter />
      </div>
      <PushNotificationPrompt />
    </div>
  );
};

export default RiderDashboardLayout;
