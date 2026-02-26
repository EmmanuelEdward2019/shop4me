import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface RiderProtectedRouteProps {
  children: React.ReactNode;
}

const RiderProtectedRoute = ({ children }: RiderProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isRider, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
      return;
    }

    if (!authLoading && !roleLoading && user && !isRider) {
      navigate("/dashboard");
    }
  }, [user, authLoading, roleLoading, isRider, navigate, location]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isRider) {
    return null;
  }

  return <>{children}</>;
};

export default RiderProtectedRoute;
