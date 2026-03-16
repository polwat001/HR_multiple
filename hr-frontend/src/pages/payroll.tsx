import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import PayrollManagement from "@/routes/PayrollManagement";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PayrollPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="payroll" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.payroll")}</div>}>
          <PayrollManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
