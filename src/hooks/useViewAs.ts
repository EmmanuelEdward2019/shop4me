import { useState, useEffect, useCallback } from "react";

const VIEW_AS_KEY = "admin_view_as";

export type ViewAsRole = "admin" | "buyer" | "agent" | null;

export const useViewAs = () => {
  const [viewAs, setViewAsState] = useState<ViewAsRole>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(VIEW_AS_KEY) as ViewAsRole;
    }
    return null;
  });

  useEffect(() => {
    if (viewAs) {
      sessionStorage.setItem(VIEW_AS_KEY, viewAs);
    } else {
      sessionStorage.removeItem(VIEW_AS_KEY);
    }
  }, [viewAs]);

  const setViewAs = useCallback((role: ViewAsRole) => {
    setViewAsState(role);
  }, []);

  const clearViewAs = useCallback(() => {
    setViewAsState(null);
    sessionStorage.removeItem(VIEW_AS_KEY);
  }, []);

  const isViewingAs = viewAs !== null && viewAs !== "admin";

  return { viewAs, setViewAs, clearViewAs, isViewingAs };
};

// Utility to check view mode without hook (for ProtectedRoute)
export const getViewAsMode = (): ViewAsRole => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(VIEW_AS_KEY) as ViewAsRole;
  }
  return null;
};
