import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ContractManagement from "@/routes/ContractManagement";
import RoleGuard from "@/components/RoleGuard";
import { Permission } from "@/types/roles";

export default function ContractsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.VIEW_COMPANY_CONTRACTS,
            Permission.MANAGE_COMPANY_CONTRACTS,
            Permission.MANAGE_CONTRACT_TEMPLATES,
          ]}
          fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูสัญญาจ้าง</div>}
        >
          <ContractManagement />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
