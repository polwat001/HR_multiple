import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import UserPermission from "@/routes/UserPermission";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function PermissionsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="permissions" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูผู้ใช้และสิทธิ์</div>}>
          <UserPermission />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
