import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import SelfService from "@/routes/SelfService";

export default function SelfServicePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="selfService" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนู Self-Service</div>}>
          <SelfService />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
