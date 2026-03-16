import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import SystemSettings from "@/routes/SystemSettings";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SystemSettingsPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="systemSettings" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.systemSettings")}</div>}>
          <SystemSettings />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
