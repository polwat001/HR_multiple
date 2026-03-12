import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import ApprovalFlowConfiguration from "@/routes/ApprovalFlowConfiguration";

export default function ApprovalFlowPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="approvalFlow" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึง Approval Flow Configuration</div>}>
          <ApprovalFlowConfiguration />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
