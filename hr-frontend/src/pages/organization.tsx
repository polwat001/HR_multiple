import { ProtectedRoute } from "@/components/ProtectedRoute";
import OrganizationStructure from "@/routes/OrganizationStructure";
import AppLayout from "@/components/AppLayout";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";

export default function OrganizationPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.VIEW_COMPANY_ORGANIZATION,
            Permission.VIEW_ALL_ORGANIZATION,
            Permission.MANAGE_ORGANIZATION,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูโครงสร้างองค์กร</div>}
        >
          <OrganizationStructure />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
