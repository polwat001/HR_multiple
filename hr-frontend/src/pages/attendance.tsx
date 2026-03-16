import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import TimeAttendance from "@/routes/TimeAttendance";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AttendancePage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="attendance" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.attendance")}</div>}>
          <TimeAttendance />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
