import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContexts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, FileWarning, Clock, TrendingUp, UserCheck, LogOut, AlertCircle, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/types/roles";

const ATTENDANCE_COLORS = [
  "hsl(145 60% 42%)", "hsl(38 92% 50%)", "hsl(0 72% 55%)", "hsl(205 80% 55%)",
];

const Dashboard = () => {
  const { selectedCompany } = useCompany();
  const { hasPermission, user: authUser } = useAuth();
  const isAll = selectedCompany.id === "all";
  const isEmployeeDashboard =
    hasPermission(Permission.VIEW_OWN_DASHBOARD) &&
    !hasPermission(Permission.VIEW_COMPANY_DASHBOARD) &&
    !hasPermission(Permission.VIEW_HOLDING_DASHBOARD);
  const isManagerDashboard =
    hasPermission(Permission.VIEW_DEPARTMENT_EMPLOYEES) &&
    !hasPermission(Permission.VIEW_COMPANY_DASHBOARD) &&
    !hasPermission(Permission.VIEW_HOLDING_DASHBOARD);
  const isCompanyDashboard =
    hasPermission(Permission.VIEW_COMPANY_DASHBOARD) &&
    !hasPermission(Permission.VIEW_HOLDING_DASHBOARD);

  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [otCostData, setOtCostData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  
  // Filters
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // ดึง current user
        try {
          const userData = await apiGet<any>("/auth/me");
          setCurrentUser(userData?.user || userData);
        } catch (error) {
          console.error("Failed to fetch current user:", error);
        }
        
        // ดึง employees
        const empData = await apiGet<any>("/employees");
        const empArray = Array.isArray(empData) ? empData : empData?.data || [];
        setEmployees(empArray);

        // ดึง contracts
        const contractData = await apiGet<any>("/contracts");
        setContracts(Array.isArray(contractData) ? contractData : contractData?.data || []);

        // ดึง pending approvals
        try {
          const approvalsData = await apiGet<any>("/approvals/pending");
          setPendingApprovals(Array.isArray(approvalsData) ? approvalsData : approvalsData?.data || []);
        } catch (error) {
          console.error("Failed to fetch pending approvals:", error);
        }

        // ดึง public holidays
        try {
          const holidaysData = await apiGet<any>("/holidays");
          setPublicHolidays(Array.isArray(holidaysData) ? holidaysData : holidaysData?.data || []);
        } catch (error) {
          console.error("Failed to fetch holidays:", error);
        }

        // ดึง leave balances (Employee ใช้ในการ์ดวันลาคงเหลือ)
        try {
          const leaveBalanceData = await apiGet<any>("/leaves/balances");
          setLeaveBalances(Array.isArray(leaveBalanceData) ? leaveBalanceData : leaveBalanceData?.data || []);
        } catch (error) {
          console.error("Failed to fetch leave balances:", error);
        }

        // ดึง attendance ล่าสุด (Employee ใช้ดูเวลาสแกนเข้า-ออกล่าสุด)
        try {
          const attendanceRes = await apiGet<any>("/attendance");
          setAttendanceLogs(Array.isArray(attendanceRes) ? attendanceRes : attendanceRes?.data || []);
        } catch (error) {
          console.error("Failed to fetch attendance logs:", error);
        }

        // ดึงคำร้องใบลา (Manager ใช้ดูทีมที่ลาวันนี้)
        try {
          const leaveReqRes = await apiGet<any>("/leaves/requests");
          setLeaveRequests(Array.isArray(leaveReqRes) ? leaveReqRes : leaveReqRes?.data || []);
        } catch (error) {
          console.error("Failed to fetch leave requests:", error);
        }

        // คำนวณ departments จาก employees
        const deptList = [...new Set((empArray || []).map((e: any) => e.department_name).filter(Boolean))];
        setDepartments(deptList);

        // ดึง attendance (mock สำหรับตอนนี้)
        setAttendanceData([
          { name: "Present", value: 150 },
          { name: "Late", value: 25 },
          { name: "Absent", value: 10 },
          { name: "WFH", value: 65 },
        ]);

        // ดึง OT Cost (mock สำหรับตอนนี้)
        setOtCostData([
          { month: "Sep", amount: 85000 },
          { month: "Oct", amount: 92000 },
          { month: "Nov", amount: 78000 },
          { month: "Dec", amount: 110000 },
          { month: "Jan", amount: 98000 },
          { month: "Feb", amount: 105000 },
        ]);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data by selected company and department
  const filteredEmployees = isCompanyDashboard
    ? employees
    : isAll
      ? employees
      : (employees || []).filter((e: any) => String(e.companyId || e.company_id || e.company_code || "") === String(selectedCompany.id));

  const deptFilteredEmployees = selectedDept === "all"
    ? filteredEmployees
    : filteredEmployees.filter((e: any) => (e.department || e.department_name) === selectedDept);

  const filteredContracts = (contracts || []).filter((c) => {
    const emp = (employees || []).find((e) => e.id === c.employeeId);
    if (isAll) return true;
    return emp?.companyId === selectedCompany.id;
  });

  // Calculate metrics
  const totalHeadcount = deptFilteredEmployees.length;
  
  const currentDate = new Date(selectedMonth);
  const newJoiners = deptFilteredEmployees.filter((e: any) => {
    if (!e.joinedDate) return false;
    const joinedDate = new Date(e.joinedDate);
    return joinedDate.getMonth() === currentDate.getMonth() && 
           joinedDate.getFullYear() === currentDate.getFullYear();
  }).length;

  const resigned = deptFilteredEmployees.filter((e: any) => {
    if (!e.resignedDate) return false;
    const resignedDate = new Date(e.resignedDate);
    return resignedDate.getMonth() === currentDate.getMonth() && 
           resignedDate.getFullYear() === currentDate.getFullYear();
  }).length;

  const totalOtHours = 150; // Mock data - should fetch from API
  
  // Department distribution for donut chart
  const deptDistribution = Array.from(
    new Map(
      deptFilteredEmployees.map((e: any) => {
        const dept = e.department || e.department_name || "Unassigned";
        return [
          dept,
          deptFilteredEmployees.filter((d: any) => (d.department || d.department_name || "Unassigned") === dept).length,
        ];
      })
    ),
    ([dept, count]: [string, number]) => ({ name: dept || "Unassigned", value: count })
  );

  // Contracts expiring in 30/60 days
  const expiringContracts = filteredContracts.filter((c: any) => {
    if (!c.expiryDate) return false;
    const expiryDate = new Date(c.expiryDate);
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 60;
  }).sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // Attendance data by status
  const attendanceByStatus = [
    { name: "Present", value: 150, color: "hsl(145 60% 42%)" },
    { name: "Late", value: 25, color: "hsl(38 92% 50%)" },
    { name: "Absent", value: 10, color: "hsl(0 72% 55%)" },
    { name: "WFH", value: 65, color: "hsl(205 80% 55%)" },
  ];

  // Upcoming holidays (next 30 days)
  const upcomingHolidays = (publicHolidays || [])
    .filter((h: any) => {
      const holidayDate = new Date(h.date);
      const daysUntilHoliday = Math.floor((holidayDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilHoliday > 0 && daysUntilHoliday <= 30;
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const statCards = [
    { label: "Total Headcount", value: totalHeadcount, icon: Users, color: "text-primary" },
    { label: "New Joiners", value: newJoiners, icon: UserCheck, color: "text-success" },
    { label: "Resigned", value: resigned, icon: LogOut, color: "text-destructive" },
    { label: "Total OT Hours", value: totalOtHours, icon: Clock, color: "text-warning" },
    { label: "Contracts Expiring", value: expiringContracts.length, icon: FileWarning, color: "text-orange-600" },
    { label: "Pending Approvals", value: (pendingApprovals || []).length, icon: AlertCircle, color: "text-info" },
  ];

  const ownLeaveBalance = (leaveBalances || []).reduce(
    (sum: number, item: any) => sum + Number(item?.balance || 0),
    0
  );

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const ownOtThisMonth = (attendanceLogs || []).reduce((sum: number, row: any) => {
    if (!row?.work_date) return sum;
    const workDate = new Date(row.work_date);
    if (workDate.getMonth() !== currentMonth || workDate.getFullYear() !== currentYear) return sum;
    const status = String(row.status || "").toLowerCase();
    return status.includes("ot") ? sum + 1 : sum;
  }, 0);

  const latestScan = (attendanceLogs || [])[0] || null;
  const currentUserId = currentUser?.user_id || authUser?.user_id;
  const myEmployeeRecord = (employees || []).find((e: any) => String(e.user_id) === String(currentUserId));
  const displayName = currentUser?.display_name || currentUser?.name || currentUser?.username || authUser?.display_name || authUser?.username || "User";
  const displayPosition = currentUser?.position_name || myEmployeeRecord?.position_name || "-";
  const todayStr = new Date().toISOString().split("T")[0];
  const teamPresentToday = (attendanceLogs || []).filter((row: any) => row.work_date === todayStr && ["present", "late"].includes(String(row.status || "").toLowerCase())).length;
  const teamAbsentToday = (attendanceLogs || []).filter((row: any) => row.work_date === todayStr && String(row.status || "").toLowerCase() === "absent").length;
  const teamLeaveToday = (leaveRequests || []).filter((lr: any) => {
    if (String(lr.status || "").toLowerCase() !== "approved") return false;
    if (!lr.start_date || !lr.end_date) return false;
    const start = new Date(lr.start_date);
    const end = new Date(lr.end_date);
    const today = new Date(todayStr);
    return start <= today && today <= end;
  }).length;

  const teamOtByDay = (() => {
    const grouped = new Map<string, number>();
    (attendanceLogs || []).forEach((row: any) => {
      const status = String(row.status || "").toLowerCase();
      if (!row.work_date || !status.includes("ot")) return;
      const day = new Date(row.work_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      grouped.set(day, (grouped.get(day) || 0) + 1);
    });
    const entries = Array.from(grouped.entries()).map(([day, count]) => ({ day, ot: count }));
    return entries.length > 0 ? entries.slice(-7) : [{ day: "No Data", ot: 0 }];
  })();

  if (loading) {
    return <div className="p-6 text-center">Loading dashboard...</div>;
  }

  if (isEmployeeDashboard) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {currentUser ? `Welcome back, ${displayName}` : "Welcome"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Personal Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">วันลาคงเหลือ</p>
              <p className="text-2xl font-bold mt-1">{ownLeaveBalance} วัน</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">สรุป OT เดือนนี้</p>
              <p className="text-2xl font-bold mt-1">{ownOtThisMonth} รายการ</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">เวลาสแกนเข้า-ออกล่าสุด</p>
              <p className="text-base font-semibold mt-1">
                {latestScan
                  ? `${latestScan.check_in_time || "-"} / ${latestScan.check_out_time || "-"}`
                  : "- / -"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestScan?.work_date ? new Date(latestScan.work_date).toLocaleDateString() : "ยังไม่มีข้อมูล"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">ข้อมูลพนักงานของฉัน</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่พบข้อมูลพนักงาน</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">รหัสพนักงาน:</span> {employees[0]?.employee_code || "-"}</div>
                <div><span className="text-muted-foreground">ชื่อ:</span> {myEmployeeRecord?.firstname_th || currentUser?.display_name || "-"} {myEmployeeRecord?.lastname_th || ""}</div>
                <div><span className="text-muted-foreground">ตำแหน่ง:</span> {displayPosition}</div>
                <div><span className="text-muted-foreground">แผนก:</span> {myEmployeeRecord?.department_name || "-"}</div>
                <div><span className="text-muted-foreground">สถานะ:</span> {myEmployeeRecord?.status || "-"}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isManagerDashboard) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {currentUser ? `Welcome back, ${displayName}` : "Department Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ภาพรวมแผนก/ทีมของคุณ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-sm text-muted-foreground">วันนี้ใครมาทำงาน</p><p className="text-2xl font-bold mt-1">{teamPresentToday}</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-sm text-muted-foreground">วันนี้ใครขาด</p><p className="text-2xl font-bold mt-1">{teamAbsentToday}</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-sm text-muted-foreground">วันนี้ใครลา</p><p className="text-2xl font-bold mt-1">{teamLeaveToday}</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-sm text-muted-foreground">สมาชิกในทีม</p><p className="text-2xl font-bold mt-1">{employees.length}</p></CardContent></Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">กราฟ OT ของทีม</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={teamOtByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                <Tooltip />
                <Bar dataKey="ot" fill="hsl(215 70% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* User Welcome Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-grey-900">
          {currentUser ? `Welcome back, ${displayName}` : "Welcome to Dashboard"}
        </h1>
        <p className="text-sm text-grey-600 mt-1">
          {selectedCompany.id === "all" ? "All Companies" : selectedCompany.shortName}
        </p>
      </div>

      {/* Stat Cards - 6 columns */}
      <div className="grid grid-cols-0 sm:grid-cols-1 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution Donut Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Employee Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={deptDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {deptDistribution.map((_, i) => (
                    <Cell key={i} fill={["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"][i % 6]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Status Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Attendance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attendanceByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(215 70% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alert Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Contracts */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-orange-600" />
              Contracts Expiring Soon (30-60 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {expiringContracts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expiring contracts</p>
              ) : (
                expiringContracts.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <div>
                      <p className="text-sm font-medium">{c.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{c.department}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {new Date(c.expiryDate).toLocaleDateString()}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(pendingApprovals || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No pending approvals</p>
              ) : (
                (pendingApprovals || []).slice(0, 5).map((approval: any) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <div>
                      <p className="text-sm font-medium">{approval.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{approval.type} - {approval.reason}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {approval.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Holidays */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Upcoming Public Holidays (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingHolidays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center col-span-full">No upcoming holidays</p>
            ) : (
              upcomingHolidays.map((holiday: any) => (
                <div key={holiday.id} className="p-3 rounded-lg border border-green-200 bg-green-50">
                  <p className="text-sm font-medium text-green-900">{holiday.name}</p>
                  <p className="text-xs text-green-700 mt-1">{new Date(holiday.date).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
