import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import HolidayManagement from "@/routes/HolidayManagement";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HolidaysPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="holidays" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.holidays")}</div>}>
          <HolidayManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
