import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import ApprovalFlowConfiguration from "@/routes/ApprovalFlowConfiguration";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ApprovalFlowPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="approvalFlow" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.approvalFlow")}</div>}>
          <ApprovalFlowConfiguration />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
