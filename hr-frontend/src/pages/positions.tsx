import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import PositionMaster from "@/routes/PositionMaster";
import RoleGuard from "@/components/RoleGuard";
import { UserRole } from "@/types/roles";

export default function PositionsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredRoles={[UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูตำแหน่งงาน</div>}
        >
          <PositionMaster />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
