import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import EmployeeList from "@/routes/EmployeeList";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmployeesPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="employees" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.employees")}</div>}>
          <EmployeeList />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
