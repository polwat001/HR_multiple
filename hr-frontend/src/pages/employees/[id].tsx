import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import EmployeeProfile from "@/routes/EmployeeProfile";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function EmployeeProfilePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="employees" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงข้อมูลพนักงาน</div>}>
          <EmployeeProfile />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
