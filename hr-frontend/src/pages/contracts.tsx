import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ContractManagement from "@/routes/ContractManagement";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function ContractsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="contracts" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูสัญญาจ้าง</div>}>
          <ContractManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
