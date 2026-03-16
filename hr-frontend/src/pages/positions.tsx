import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import PositionMaster from "@/routes/PositionMaster";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PositionsPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="positions" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.positions")}</div>}>
          <PositionMaster />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
