import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import TimeAttendance from "@/routes/TimeAttendance";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.VIEW_OWN_ATTENDANCE,
            Permission.VIEW_DEPARTMENT_ATTENDANCE,
            Permission.VIEW_COMPANY_ATTENDANCE,
            Permission.MANAGE_ATTENDANCE,
            Permission.REQUEST_OT,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูเวลาและ OT</div>}
        >
          <TimeAttendance />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
