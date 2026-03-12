import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import ContactManagement from "@/routes/ContactManagement";

export default function ContactsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="contacts" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึง Contact Directory</div>}>
          <ContactManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
