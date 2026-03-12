import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LeaveManagement from "@/routes/LeaveManagement";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="leave" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูการลา</div>}>
          <LeaveManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
