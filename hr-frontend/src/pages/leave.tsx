import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LeaveManagement from "@/routes/LeaveManagement";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LeavePage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="leave" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.leave")}</div>}>
          <LeaveManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
