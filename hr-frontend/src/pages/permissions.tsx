import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import UserPermission from "@/routes/UserPermission";
import RoleGuard from "@/components/RoleGuard";
import { UserRole } from "@/types/roles";

export default function PermissionsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredRoles={[UserRole.SUPER_ADMIN]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูผู้ใช้และสิทธิ์</div>}
        >
          <UserPermission />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
