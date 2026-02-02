import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Shield, ShoppingBag, Truck } from "lucide-react";
import { useViewAs, ViewAsRole } from "@/hooks/useViewAs";

const AdminViewSwitcher = () => {
  const { viewAs, setViewAs } = useViewAs();
  const navigate = useNavigate();

  const handleViewAs = (role: ViewAsRole) => {
    setViewAs(role);
    
    switch (role) {
      case "buyer":
        navigate("/dashboard");
        break;
      case "agent":
        navigate("/agent");
        break;
      case "admin":
      default:
        navigate("/admin");
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">View As</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleViewAs("admin")}
          className={!viewAs || viewAs === "admin" ? "bg-muted" : ""}
        >
          <Shield className="h-4 w-4 mr-2" />
          Admin Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleViewAs("buyer")}
          className={viewAs === "buyer" ? "bg-muted" : ""}
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          Buyer Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleViewAs("agent")}
          className={viewAs === "agent" ? "bg-muted" : ""}
        >
          <Truck className="h-4 w-4 mr-2" />
          Agent Dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminViewSwitcher;
