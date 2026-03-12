import Dashboard from "@/routes/Dashboard";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="dashboard">
          <Dashboard />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
