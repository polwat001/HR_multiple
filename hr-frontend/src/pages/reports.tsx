import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Reports from "@/routes/Reports";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="reports" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูรายงาน</div>}>
          <Reports />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
