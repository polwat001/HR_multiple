import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import TimeAttendance from "@/routes/TimeAttendance";
import ModuleAccessGuard from "@/components/ModuleAccessGuard";

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ModuleAccessGuard moduleKey="attendance" fallback={<div className="p-6 text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงเมนูเวลาและ OT</div>}>
          <TimeAttendance />
        </ModuleAccessGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
