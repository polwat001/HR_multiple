import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Reports from "@/routes/Reports";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.VIEW_DEPARTMENT_REPORTS,
            Permission.VIEW_COMPANY_REPORTS,
            Permission.VIEW_CONSOLIDATED_REPORTS,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูรายงาน</div>}
        >
          <Reports />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
