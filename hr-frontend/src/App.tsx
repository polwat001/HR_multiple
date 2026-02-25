import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import EmployeeList from "@/pages/EmployeeList";
import EmployeeProfile from "@/pages/EmployeeProfile";
import OrganizationStructure from "@/pages/OrganizationStructure";
import PositionMaster from "@/pages/PositionMaster";
import TimeAttendance from "@/pages/TimeAttendance";
import LeaveManagement from "@/pages/LeaveManagement";
import ContractManagement from "@/pages/ContractManagement";
import Reports from "@/pages/Reports";
import UserPermissions from "@/pages/UserPermissions";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CompanyProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/organization" element={<OrganizationStructure />} />
              <Route path="/positions" element={<PositionMaster />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/attendance" element={<TimeAttendance />} />
              <Route path="/leave" element={<LeaveManagement />} />
              <Route path="/contracts" element={<ContractManagement />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/permissions" element={<UserPermissions />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </CompanyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
export { default } from "@/layout";
export { default } from "@/page";