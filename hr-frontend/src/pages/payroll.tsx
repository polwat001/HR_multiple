import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import PayrollManagement from "@/routes/PayrollManagement";

export default function PayrollPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="payroll" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึง Payroll Management</div>}>
          <PayrollManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
