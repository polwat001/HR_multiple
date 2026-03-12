import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import PositionMaster from "@/routes/PositionMaster";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function PositionsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="positions" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูตำแหน่งงาน</div>}>
          <PositionMaster />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
