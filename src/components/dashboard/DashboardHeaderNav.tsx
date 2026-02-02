import { Link, useLocation } from "react-router-dom";
import { Info, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DashboardHeaderNavProps {
  variant?: "buyer" | "agent" | "admin";
}

const DashboardHeaderNav = ({ variant = "buyer" }: DashboardHeaderNavProps) => {
  const location = useLocation();

  const navLinks = [
    { label: "How It Works", href: "/how-it-works" },
    { label: "For Agents", href: "/for-agents" },
    { label: "Locations", href: "/locations" },
    { label: "FAQs", href: "/faq" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            to={link.href}
            className={`text-sm font-medium transition-colors ${
              isActive(link.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile Navigation Dropdown */}
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Info className="h-5 w-5" />
              <span className="sr-only">More info</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            {navLinks.map((link) => (
              <DropdownMenuItem key={link.label} asChild>
                <Link
                  to={link.href}
                  className={`w-full ${
                    isActive(link.href) ? "text-primary font-medium" : ""
                  }`}
                >
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

export default DashboardHeaderNav;
