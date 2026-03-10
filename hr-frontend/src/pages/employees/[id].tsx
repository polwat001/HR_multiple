import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import EmployeeProfile from "@/routes/EmployeeProfile";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";

export default function EmployeeProfilePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.MANAGE_COMPANY_EMPLOYEES,
            Permission.MANAGE_ALL_EMPLOYEES,
            Permission.VIEW_OWN_PROFILE,
            Permission.VIEW_DEPARTMENT_EMPLOYEES,
            Permission.VIEW_COMPANY_EMPLOYEES,
            Permission.VIEW_ALL_EMPLOYEES,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงข้อมูลพนักงาน</div>}
        >
          <EmployeeProfile />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
