import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getViewAsMode } from "@/hooks/useViewAs";
import ViewAsBanner from "@/components/dashboard/ViewAsBanner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin, isAgent, isRider } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
      return;
    }

    // Check if admin is viewing as another role
    const viewAsMode = getViewAsMode();
    
    // Redirect admins and agents to their respective dashboards
    // unless they're explicitly viewing as buyer
    if (!authLoading && !roleLoading && user) {
      if (isAdmin && viewAsMode !== "buyer") {
        navigate("/admin", { replace: true });
        return;
      }
      if (isAgent && !isAdmin && viewAsMode !== "buyer") {
        navigate("/agent", { replace: true });
        return;
      }
      if (isRider && !isAdmin && !isAgent && viewAsMode !== "buyer") {
        navigate("/rider", { replace: true });
        return;
      }
    }
  }, [user, authLoading, roleLoading, isAdmin, isAgent, isRider, navigate, location]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check view mode for admins
  const viewAsMode = getViewAsMode();
  
  // If admin viewing as buyer, show the content with banner
  if (isAdmin && viewAsMode === "buyer") {
    return (
      <>
        <ViewAsBanner />
        <div className="pt-10">{children}</div>
      </>
    );
  }

  // If admin, agent, or rider not in view-as mode, don't render buyer dashboard
  if ((isAdmin || isAgent || (isRider && !isAdmin)) && viewAsMode !== "buyer") {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
