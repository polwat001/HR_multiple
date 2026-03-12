import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import EmployeeList from "@/routes/EmployeeList";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="employees" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงข้อมูลพนักงาน</div>}>
          <EmployeeList />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
