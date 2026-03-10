import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";
import SystemSettings from "@/routes/SystemSettings";

export default function SystemSettingsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[Permission.MANAGE_SYSTEM_SETTINGS]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงการตั้งค่าระบบ</div>}
        >
          <SystemSettings />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
