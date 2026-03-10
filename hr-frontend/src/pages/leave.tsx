import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LeaveManagement from "@/routes/LeaveManagement";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.VIEW_COMPANY_DASHBOARD,
            Permission.VIEW_HOLDING_DASHBOARD,
            Permission.REQUEST_LEAVE,
            Permission.APPROVE_DEPARTMENT_LEAVE,
            Permission.MANAGE_COMPANY_LEAVE,
            Permission.MANAGE_ALL_LEAVE,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูการลา</div>}
        >
          <LeaveManagement />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
