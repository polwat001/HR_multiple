import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";
import HolidayManagement from "@/routes/HolidayManagement";

export default function HolidaysPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.VIEW_HOLIDAYS,
            Permission.MANAGE_COMPANY_HOLIDAYS,
            Permission.MANAGE_ALL_HOLIDAYS,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูวันหยุดนักขัตฤกษ์</div>}
        >
          <HolidayManagement />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
