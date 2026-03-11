import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import SelfService from "@/routes/SelfService";
import { UserRole } from "@/types/roles";

export default function SelfServicePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredRoles={[
            UserRole.EMPLOYEE,
            UserRole.MANAGER,
            UserRole.HR_COMPANY,
            UserRole.CENTRAL_HR,
            UserRole.SUPER_ADMIN,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนู Self-Service</div>}
        >
          <SelfService />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
