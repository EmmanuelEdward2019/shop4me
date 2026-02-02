import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface AgentProtectedRouteProps {
  children: React.ReactNode;
}

const AgentProtectedRoute = ({ children }: AgentProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAgent, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
      return;
    }

    if (!authLoading && !roleLoading && user && !isAgent) {
      // User is logged in but not an agent - redirect to buyer dashboard
      navigate("/dashboard");
    }
  }, [user, authLoading, roleLoading, isAgent, navigate, location]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAgent) {
    return null;
  }

  return <>{children}</>;
};

export default AgentProtectedRoute;
