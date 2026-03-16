import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import AuditLog from "@/routes/AuditLog";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuditLogPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="auditLog" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.auditLog")}</div>}>
          <AuditLog />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
