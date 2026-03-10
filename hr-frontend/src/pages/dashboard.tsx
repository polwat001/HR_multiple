import Dashboard from "@/routes/Dashboard";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
