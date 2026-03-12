import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import SystemSettings from "@/routes/SystemSettings";

export default function SystemSettingsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="systemSettings" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงการตั้งค่าระบบ</div>}>
          <SystemSettings />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
