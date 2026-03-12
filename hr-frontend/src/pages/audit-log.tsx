import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import AuditLog from "@/routes/AuditLog";

export default function AuditLogPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="auditLog" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึง Transaction Log</div>}>
          <AuditLog />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
