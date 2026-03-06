import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CompanyProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/organization" element={<OrganizationStructure />} />
              <Route path="/positions" element={<PositionMaster />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/attendance" element={<TimeAttendance />} />
              <Route path="/leave" element={<LeaveManagement />} />
              <Route path="/contracts" element={<ContractManagement />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/permissions" element={<UserPermissions />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </CompanyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;