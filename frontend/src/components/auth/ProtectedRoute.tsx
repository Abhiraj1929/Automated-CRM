// ============================================================
// ProtectedRoute - Route guard with role-based access
// ============================================================
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ("admin" | "manager" | "employee")[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on role
      router.push(getDashboardPath(user.role));
    }
  }, [user, loading, router, requiredRoles]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requiredRoles && !requiredRoles.includes(user.role)) return null;

  return <>{children}</>;
}

/**
 * Get dashboard path based on user role
 */
export function getDashboardPath(role: string): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "manager":
      return "/dashboard";
    case "employee":
      return "/dashboard";
    default:
      return "/login";
  }
}
