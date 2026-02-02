import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin, isAgent } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
      return;
    }

    // Redirect admins and agents to their respective dashboards
    if (!authLoading && !roleLoading && user) {
      if (isAdmin) {
        navigate("/admin", { replace: true });
        return;
      }
      if (isAgent) {
        navigate("/agent", { replace: true });
        return;
      }
    }
  }, [user, authLoading, roleLoading, isAdmin, isAgent, navigate, location]);

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

  // If admin or agent, don't render buyer dashboard (redirect is happening)
  if (isAdmin || isAgent) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
