import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import SelfService from "@/routes/SelfService";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SelfServicePage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="selfService" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.selfService")}</div>}>
          <SelfService />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
