import { ProtectedRoute } from "@/components/ProtectedRoute";
import OrganizationStructure from "@/routes/OrganizationStructure";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OrganizationTreePage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="organization" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.organization")}</div>}>
          <OrganizationStructure />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
