import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { useViewAs } from "@/hooks/useViewAs";

const ViewAsBanner = () => {
  const { viewAs, clearViewAs } = useViewAs();
  const navigate = useNavigate();

  if (!viewAs || viewAs === "admin") {
    return null;
  }

  const handleReturnToAdmin = () => {
    clearViewAs();
    navigate("/admin");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">
            Viewing as {viewAs === "buyer" ? "Buyer" : "Agent"} (Admin Mode)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReturnToAdmin}
          className="text-destructive-foreground hover:bg-destructive-foreground/10 gap-1"
        >
          <X className="h-4 w-4" />
          Return to Admin
        </Button>
      </div>
    </div>
  );
};

export default ViewAsBanner;
