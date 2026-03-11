import Dashboard from "@/routes/Dashboard";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/roles";

export default function DashboardPage() {
  const router = useRouter();
  const { hasRole, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (hasRole(UserRole.EMPLOYEE)) {
      router.replace("/self-service");
    }
  }, [hasRole, loading, router]);

  if (loading || hasRole(UserRole.EMPLOYEE)) {
    return null;
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
