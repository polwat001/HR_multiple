import { ProtectedRoute } from "@/components/ProtectedRoute";
import OrganizationStructure from "@/routes/OrganizationStructure";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function OrganizationPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="organization" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูโครงสร้างองค์กร</div>}>
          <OrganizationStructure />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
