import { Link, useLocation } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

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

  const dashboardLink = variant === "admin" ? "/admin" : variant === "agent" ? "/agent" : "/dashboard";

  return (
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
  );
};

export default DashboardHeaderNav;
