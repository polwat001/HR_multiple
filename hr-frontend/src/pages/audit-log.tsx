import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";
import AuditLog from "@/routes/AuditLog";

export default function AuditLogPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[Permission.VIEW_AUDIT_LOGS]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึง Transaction Log</div>}
        >
          <AuditLog />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
