import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Reports from "@/routes/Reports";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ReportsPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="reports" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.reports")}</div>}>
          <Reports />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
