import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ApprovalInbox from "@/routes/ApprovalInbox";

export default function ApprovalsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ApprovalInbox />
      </AppLayout>
    </ProtectedRoute>
  );
}
