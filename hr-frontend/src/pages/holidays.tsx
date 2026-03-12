import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";
import HolidayManagement from "@/routes/HolidayManagement";

export default function HolidaysPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="holidays" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูวันหยุดนักขัตฤกษ์</div>}>
          <HolidayManagement />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
