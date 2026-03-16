import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import UserPermission from "@/routes/UserPermission";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PermissionsPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="permissions" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.permissions")}</div>}>
          <UserPermission />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
