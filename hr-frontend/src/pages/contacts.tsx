import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import ContactManagement from "@/routes/ContactManagement";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ContactsPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="contacts" fallback={<div className="p-6 text-sm text-muted-foreground">{t("pages.noAccess.contacts")}</div>}>
          <ContactManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
