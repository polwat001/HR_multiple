import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContexts";
import AppLayout from "@/components/AppLayout";

import Dashboard from "@/routes/Dashboard";
import EmployeeList from "@/routes/EmployeeList";
import EmployeeProfile from "@/routes/EmployeeProfile";
import OrganizationStructure from "@/routes/OrganizationStructure";
import PositionMaster from "@/routes/PositionMaster";
import TimeAttendance from "@/routes/TimeAttendance";
import LeaveManagement from "@/routes/LeaveManagement";
import ContractManagement from "@/routes/ContractManagement";
import Reports from "@/routes/Reports";
import UserPermissions from "@/routes/UserPermission";
import NotFound from "@/routes/NotFound";
import Login from "@/routes/Login";

const queryClient = new QueryClient();

// ==========================================
// 🛡️ ยามเฝ้าประตู (Protected Route)
// ==========================================
const ProtectedRoute = ({ requireAdmin = false }) => {
  const token = localStorage.getItem("token");
  const userDataStr = localStorage.getItem("userData");
  const user = userDataStr ? JSON.parse(userDataStr) : null;

  // 1. ถ้าไม่มี Token (ยังไม่ Login) เตะไปหน้า Login
  if (!token) {
    return <Navigate to="/Login" replace />;
  }

  // 2. เช็คสิทธิ์สำหรับหน้าพิเศษ (เช่น หน้า Permissions)
  if (requireAdmin) {
    // 💡 เช็คจาก role ที่ Backend ส่งมาให้ ("Central HR", "Super Admin", ฯลฯ)
    const isAuthorized = 
      user?.role === "Super Admin" || 
      user?.role === "Central HR" || 
      user?.role === "HR Company";

    if (!isAuthorized) {
      // ถ้าเป็นแค่ Manager หรือ Employee ให้เตะกลับหน้า Dashboard
      return <Navigate to="/dashboard" replace />; 
    }
  }

  // 3. ผ่านทุกด่าน! เอา AppLayout (ที่มี Sidebar/Header) มาครอบเนื้อหา
  return (
    <AppLayout>
      <Outlet /> 
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CompanyProvider>
        <BrowserRouter>
          <Routes>
            {/* 🚪 เส้นทางสาธารณะ (หน้า Login จะไม่มีเมนู Sidebar โผล่มากวนใจ) */}
            <Route path="/login" element={<Login />} />

            {/* 🏢 เส้นทางทั่วไป (ต้อง Login ก่อนถึงจะเข้าได้) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/organization" element={<OrganizationStructure />} />
              <Route path="/positions" element={<PositionMaster />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/attendance" element={<TimeAttendance />} />
              <Route path="/leave" element={<LeaveManagement />} />
              <Route path="/contracts" element={<ContractManagement />} />
              <Route path="/reports" element={<Reports />} />
            </Route>

            {/* 👑 เส้นทางพิเศษ (ต้อง Login + ต้องเป็น HR/Admin เท่านั้น) */}
            <Route element={<ProtectedRoute requireAdmin={true} />}>
              <Route path="/permissions" element={<UserPermissions />} />
            </Route>

            {/* ❓ หน้า 404 สำหรับ URL ที่พิมพ์ผิด */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CompanyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App; 