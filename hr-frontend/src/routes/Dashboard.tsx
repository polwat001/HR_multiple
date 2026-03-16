import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContexts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileWarning, Clock, UserCheck, LogOut, AlertCircle, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { resolveRoleViewKey } from "@/lib/accessMatrix";
import { useLanguage } from "@/contexts/LanguageContext";

const Dashboard = () => {
  const { t } = useLanguage();
  const { selectedCompany } = useCompany();
  const { user: authUser } = useAuth();
  const isAll = selectedCompany.id === "all";

  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [otSummary, setOtSummary] = useState<any>({ total_hours: 0 });
  
  // Filters
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [loading, setLoading] = useState(true);

  const roleViewKey = resolveRoleViewKey((currentUser || authUser) as any);
  const isEmployeeDashboard = roleViewKey === "employee";
  const isManagerDashboard = roleViewKey === "manager";
  const isHrCompanyDashboard = roleViewKey === "hr_company";
  const isCentralHrDashboard = roleViewKey === "central_hr";
  const isSuperAdminDashboard = roleViewKey === "super_admin";

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

        // ดึงสรุป OT ตาม scope role ปัจจุบัน
        try {
          const otSummaryRes = await apiGet<any>(`/ot/summary?month=${selectedMonth}`);
          setOtSummary(otSummaryRes?.data || { total_hours: 0 });
        } catch (error) {
          console.error("Failed to fetch OT summary:", error);
        }

        // คำนวณ departments จาก employees
        const deptList = [...new Set((empArray || []).map((e: any) => e.department_name).filter(Boolean))];
        setDepartments(deptList);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  // Filter data by selected company and department
  const filteredEmployees = isHrCompanyDashboard
    ? employees
    : isAll
      ? employees
      : (employees || []).filter((e: any) => String(e.companyId || e.company_id || e.company_code || "") === String(selectedCompany.id));

  const deptFilteredEmployees = selectedDept === "all"
    ? filteredEmployees
    : filteredEmployees.filter((e: any) => (e.department || e.department_name) === selectedDept);

  const filteredContracts = (contracts || []).filter((c) => {
    const emp = (employees || []).find((e: any) => e.id === c.employee_id || e.id === c.employeeId);
    if (isAll) return true;
    return String(emp?.company_id || emp?.companyId || "") === String(selectedCompany.id);
  });

  // Calculate metrics
  const totalHeadcount = deptFilteredEmployees.length;
  
  const currentDate = new Date(selectedMonth);
  const newJoiners = deptFilteredEmployees.filter((e: any) => {
    const joinedValue = e.joined_date || e.joinedDate || e.hire_date;
    if (!joinedValue) return false;
    const joinedDate = new Date(joinedValue);
    return joinedDate.getMonth() === currentDate.getMonth() && 
           joinedDate.getFullYear() === currentDate.getFullYear();
  }).length;

  const resigned = deptFilteredEmployees.filter((e: any) => {
    const resignedValue = e.resigned_date || e.resignedDate;
    if (!resignedValue) return String(e.status || "").toLowerCase() === "resigned";
    const resignedDate = new Date(resignedValue);
    return resignedDate.getMonth() === currentDate.getMonth() && 
           resignedDate.getFullYear() === currentDate.getFullYear();
  }).length;

  const totalOtHours = Number(otSummary?.total_hours || 0);
  
  // Department distribution for donut chart
  const deptDistribution = Array.from(
    new Map(
      deptFilteredEmployees.map((e: any) => {
        const dept = e.department || e.department_name || "Unassigned";
        return [
          dept,
          deptFilteredEmployees.filter((d: any) => (d.department || d.department_name || t("dashboard.common.unassigned")) === dept).length,
        ];
      })
    ),
    ([dept, count]: [string, number]) => ({ name: dept || t("dashboard.common.unassigned"), value: count })
  );

  // Contracts expiring in 30/60 days
  const expiringContracts = filteredContracts.filter((c: any) => {
    const expiryValue = c.end_date || c.expiryDate;
    if (!expiryValue) return false;
    const expiryDate = new Date(expiryValue);
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 60;
  }).sort((a: any, b: any) => {
    const aExpiry = new Date(a.end_date || a.expiryDate).getTime();
    const bExpiry = new Date(b.end_date || b.expiryDate).getTime();
    return aExpiry - bExpiry;
  });

  // Attendance data by status
  const monthAttendanceLogs = (attendanceLogs || []).filter((row: any) =>
    String(row?.work_date || "").startsWith(`${selectedMonth}-`)
  );

  const attendanceByStatus = [
    { name: t("dashboard.attendance.present"), value: monthAttendanceLogs.filter((r: any) => String(r.status || "").toLowerCase() === "present").length, color: "hsl(145 60% 42%)" },
    { name: t("dashboard.attendance.late"), value: monthAttendanceLogs.filter((r: any) => String(r.status || "").toLowerCase() === "late").length, color: "hsl(38 92% 50%)" },
    { name: t("dashboard.attendance.absent"), value: monthAttendanceLogs.filter((r: any) => String(r.status || "").toLowerCase() === "absent").length, color: "hsl(0 72% 55%)" },
    { name: t("dashboard.attendance.leave"), value: monthAttendanceLogs.filter((r: any) => String(r.status || "").toLowerCase() === "leave").length, color: "hsl(205 80% 55%)" },
  ];

  // Upcoming holidays (next 30 days)
  const upcomingHolidays = (publicHolidays || [])
    .filter((h: any) => {
      const holidayDate = new Date(h.holiday_date || h.date);
      const daysUntilHoliday = Math.floor((holidayDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilHoliday > 0 && daysUntilHoliday <= 30;
    })
    .sort((a: any, b: any) => new Date(a.holiday_date || a.date).getTime() - new Date(b.holiday_date || b.date).getTime());

  const statCards = [
    { key: "total_headcount", label: t("dashboard.statCards.totalHeadcount"), value: totalHeadcount, icon: Users, color: "text-primary" },
    { key: "new_joiners", label: t("dashboard.statCards.newJoiners"), value: newJoiners, icon: UserCheck, color: "text-success" },
    { key: "resigned", label: t("dashboard.statCards.resigned"), value: resigned, icon: LogOut, color: "text-destructive" },
    { key: "total_ot", label: t("dashboard.statCards.totalOtHours"), value: totalOtHours, icon: Clock, color: "text-warning" },
    { key: "contracts_expiring", label: t("dashboard.statCards.contractsExpiring"), value: expiringContracts.length, icon: FileWarning, color: "text-orange-600" },
    { key: "pending_approvals", label: t("dashboard.statCards.pendingApprovals"), value: (pendingApprovals || []).length, icon: AlertCircle, color: "text-info" },
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
  const ownPendingLeaves = (leaveRequests || []).filter(
    (row: any) => String(row?.status || "").toLowerCase() === "pending"
  ).length;
  const ownLateThisMonth = (attendanceLogs || []).filter((row: any) => {
    if (!row?.work_date) return false;
    const workDate = new Date(row.work_date);
    if (workDate.getMonth() !== currentMonth || workDate.getFullYear() !== currentYear) return false;
    return String(row.status || "").toLowerCase() === "late";
  }).length;
  const currentUserId = currentUser?.user_id || authUser?.user_id;
  const myEmployeeRecord = (employees || []).find((e: any) => String(e.user_id) === String(currentUserId));
  const displayName = currentUser?.display_name || currentUser?.name || currentUser?.username || authUser?.display_name || authUser?.username || "User";
  const displayPosition = currentUser?.position_name || myEmployeeRecord?.position_name || "-";
  const todayStr = new Date().toISOString().split("T")[0];
  const managerUserId = String(currentUser?.user_id || authUser?.user_id || "");
  const teamMembers = (employees || []).filter((e: any) => String(e.user_id || "") !== managerUserId);
  const teamEmployeeCodes = new Set(teamMembers.map((e: any) => String(e.employee_code || "")).filter(Boolean));
  const teamUserIds = new Set(teamMembers.map((e: any) => String(e.user_id || "")).filter(Boolean));

  const teamAttendanceToday = (attendanceLogs || []).filter((row: any) => {
    if (row.work_date !== todayStr) return false;
    return teamEmployeeCodes.has(String(row.employee_code || ""));
  });

  const teamLateToday = teamAttendanceToday.filter((row: any) => String(row.status || "").toLowerCase() === "late").length;
  const teamAbsentToday = teamAttendanceToday.filter((row: any) => String(row.status || "").toLowerCase() === "absent").length;
  const teamPresentToday = teamAttendanceToday.filter((row: any) => String(row.status || "").toLowerCase() === "present").length;

  const teamLeaveToday = (leaveRequests || []).filter((lr: any) => {
    if (!teamEmployeeCodes.has(String(lr.employee_code || ""))) return false;
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
      if (!teamEmployeeCodes.has(String(row.employee_code || ""))) return;
      const day = new Date(row.work_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      grouped.set(day, (grouped.get(day) || 0) + 1);
    });
    const entries = Array.from(grouped.entries()).map(([day, count]) => ({ day, ot: count }));
    return entries.length > 0 ? entries.slice(-7) : [{ day: t("dashboard.common.noData"), ot: 0 }];
  })();

  const teamPendingRequests = (pendingApprovals || []).filter((item: any) =>
    teamUserIds.has(String(item.requester_id || item.requested_by || ""))
  );

  const pendingLeaveRequestsFromTeam = (leaveRequests || []).filter((lr: any) => {
    if (!teamEmployeeCodes.has(String(lr.employee_code || ""))) return false;
    return String(lr.status || "").toLowerCase() === "pending";
  });

  const themeRoleKey = roleViewKey === "unknown" ? "default" : roleViewKey;

  const roleTheme = {
    employee: {
      label: t("dashboard.roles.employee"),
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      cardClass: "border-emerald-200 bg-emerald-50/40",
      priorityClass: "ring-2 ring-emerald-300 border-emerald-300",
    },
    manager: {
      label: t("dashboard.roles.manager"),
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
      cardClass: "border-amber-200 bg-amber-50/40",
      priorityClass: "ring-2 ring-amber-300 border-amber-300",
    },
    hr_company: {
      label: t("dashboard.roles.hrCompany"),
      badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
      cardClass: "border-blue-200 bg-blue-50/40",
      priorityClass: "ring-2 ring-blue-300 border-blue-300",
    },
    central_hr: {
      label: t("dashboard.roles.centralHr"),
      badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
      cardClass: "border-indigo-200 bg-indigo-50/40",
      priorityClass: "ring-2 ring-indigo-300 border-indigo-300",
    },
    super_admin: {
      label: t("dashboard.roles.superAdmin"),
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      cardClass: "border-rose-200 bg-rose-50/40",
      priorityClass: "ring-2 ring-rose-300 border-rose-300",
    },
    default: {
      label: t("dashboard.common.dashboard"),
      badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
      cardClass: "border-border",
      priorityClass: "ring-2 ring-slate-300 border-slate-300",
    },
  }[themeRoleKey];

  const companyScopeLabel = selectedCompany.id === "all" ? t("dashboard.common.allCompanies") : selectedCompany.shortName;
  const generalDashboardHeader = (() => {
    if (isSuperAdminDashboard) {
      return {
        title: currentUser ? `${t("dashboard.header.welcomeBackPrefix")} ${displayName} (${t("dashboard.roles.superAdmin")})` : t("dashboard.header.superAdminTitle"),
        subtitle: t("dashboard.header.superAdminSubtitle"),
      };
    }
    if (isCentralHrDashboard) {
      return {
        title: currentUser ? `${t("dashboard.header.welcomeBackPrefix")} ${displayName} (${t("dashboard.roles.centralHr")})` : t("dashboard.header.centralHrTitle"),
        subtitle: t("dashboard.header.centralHrSubtitle"),
      };
    }
    if (isHrCompanyDashboard) {
      return {
        title: currentUser ? `${t("dashboard.header.welcomeBackPrefix")} ${displayName} (${t("dashboard.roles.hrCompany")})` : t("dashboard.header.hrCompanyTitle"),
        subtitle: t("dashboard.header.hrCompanySubtitlePrefix") + " " + companyScopeLabel,
      };
    }
    return {
      title: currentUser ? `${t("dashboard.header.welcomeBackPrefix")} ${displayName}` : t("dashboard.header.welcomeDashboard"),
      subtitle: companyScopeLabel,
    };
  })();

  const priorityOrder = (() => {
    if (isSuperAdminDashboard || isCentralHrDashboard) {
      return ["pending_approvals", "total_headcount", "new_joiners", "resigned", "contracts_expiring", "total_ot"];
    }
    if (isHrCompanyDashboard) {
      return ["pending_approvals", "contracts_expiring", "total_headcount", "new_joiners", "resigned", "total_ot"];
    }
    return ["total_headcount", "new_joiners", "resigned", "total_ot", "contracts_expiring", "pending_approvals"];
  })();

  const prioritizedStatCards = priorityOrder
    .map((key) => statCards.find((c) => c.key === key))
    .filter(Boolean) as typeof statCards;

  if (loading) {
    return <div className="p-6 text-center">{t("dashboard.loading")}</div>;
  }

  if (isEmployeeDashboard) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentUser ? `${t("dashboard.header.welcomeBackPrefix")} ${displayName}` : t("dashboard.employee.title")}
            </h1>
            <Badge variant="outline" className={roleTheme.badgeClass}>{roleTheme.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.employee.subtitle")}</p>
        </div>

        <div className="grid grid-cols-0 md:grid-cols-4 gap-6">
          <Card className={`shadow-card ${roleTheme.cardClass} ${roleTheme.priorityClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.employee.cards.remainingLeave")}</p><p className="text-2xl font-bold mt-1">{ownLeaveBalance}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.employee.cards.pendingLeave")}</p><p className="text-2xl font-bold mt-1">{ownPendingLeaves}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.employee.cards.lateThisMonth")}</p><p className="text-2xl font-bold mt-1">{ownLateThisMonth}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.employee.cards.otThisMonth")}</p><p className="text-2xl font-bold mt-1">{ownOtThisMonth}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("dashboard.employee.latestAttendance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-sm"><span className="text-muted-foreground">{t("dashboard.common.date")}:</span> {latestScan?.work_date || "-"}</p>
                <p className="text-sm"><span className="text-muted-foreground">Check-in:</span> {latestScan?.check_in_time || "-"}</p>
                <p className="text-sm"><span className="text-muted-foreground">Check-out:</span> {latestScan?.check_out_time || "-"}</p>
                <p className="text-sm"><span className="text-muted-foreground">{t("dashboard.common.status")}:</span> {latestScan?.status || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("dashboard.common.upcomingHolidays")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {upcomingHolidays.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.common.noUpcomingHolidays")}</p>
                ) : (
                  upcomingHolidays.slice(0, 5).map((holiday: any) => (
                    <div key={holiday.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <p className="text-sm font-medium">{holiday.holiday_name_th || holiday.name || "-"}</p>
                      <Badge variant="outline">{new Date(holiday.holiday_date || holiday.date).toLocaleDateString()}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isManagerDashboard) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentUser ? `${t("dashboard.header.welcomeBackPrefix")} ${displayName}` : t("dashboard.manager.title")}
            </h1>
            <Badge variant="outline" className={roleTheme.badgeClass}>{roleTheme.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.manager.subtitle")}</p>
        </div>

        <div className="grid grid-cols-0 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-0 gap-6">
          <Card className={`shadow-card ${roleTheme.cardClass} ${roleTheme.priorityClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.manager.cards.pendingApprovals")}</p><p className="text-2xl font-bold mt-1">{teamPendingRequests.length}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.manager.cards.present")}</p><p className="text-2xl font-bold mt-1">{teamPresentToday}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.manager.cards.late")}</p><p className="text-2xl font-bold mt-1">{teamLateToday}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.manager.cards.absent")}</p><p className="text-2xl font-bold mt-1">{teamAbsentToday}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.manager.cards.leave")}</p><p className="text-2xl font-bold mt-1">{teamLeaveToday}</p></CardContent></Card>
          <Card className={`shadow-card ${roleTheme.cardClass}`}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.manager.cards.teamMembers")}</p><p className="text-2xl font-bold mt-1">{teamMembers.length}</p></CardContent></Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("dashboard.manager.teamOtChart")}</CardTitle>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("dashboard.manager.pendingRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {teamPendingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.common.noPendingApprovals")}</p>
                ) : (
                  teamPendingRequests.slice(0, 8).map((item: any) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20">
                      <div>
                        <p className="text-sm font-medium">{item.requester_name || `User #${item.requested_by}`}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.approval_type || "request"} • {item.department_name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{item.request_reason || "-"}</p>
                      </div>
                      <Badge variant="outline">{t("dashboard.common.pending")}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("dashboard.manager.latestTeamLeave")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingLeaveRequestsFromTeam.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.common.noPendingLeave")}</p>
                ) : (
                  pendingLeaveRequestsFromTeam.slice(0, 8).map((lr: any) => (
                    <div key={lr.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20">
                      <div>
                        <p className="text-sm font-medium">{`${lr.firstname_th || ""} ${lr.lastname_th || ""}`.trim() || lr.employee_code}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{lr.leave_type_name || "Leave"} • {lr.start_date} - {lr.end_date}</p>
                        <p className="text-xs text-muted-foreground">{lr.reason || "-"}</p>
                      </div>
                      <Badge variant="outline">{t("dashboard.common.pending")}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* User Welcome Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-grey-900">
            {generalDashboardHeader.title}
          </h1>
          <Badge variant="outline" className={roleTheme.badgeClass}>{roleTheme.label}</Badge>
        </div>
        <p className="text-sm text-grey-600 mt-1">
          {generalDashboardHeader.subtitle}
        </p>
      </div>

      {/* Stat Cards - 6 columns */}
      <div className="grid grid-cols-0 sm:grid-cols-1 lg:grid-cols-3 gap-6">
        {prioritizedStatCards.map((stat) => (
          <Card key={stat.label} className={`shadow-card hover:shadow-card-hover transition-shadow ${roleTheme.cardClass} ${stat.key === priorityOrder[0] ? roleTheme.priorityClass : ""}`}>
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
            <CardTitle className="text-base font-semibold">{t("dashboard.charts.employeeDistribution")}</CardTitle>
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
            <CardTitle className="text-base font-semibold">{t("dashboard.charts.attendanceStatus")}</CardTitle>
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
              {t("dashboard.alerts.expiringContracts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {expiringContracts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.alerts.noExpiringContracts")}</p>
              ) : (
                expiringContracts.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <div>
                      <p className="text-sm font-medium">{`${c.firstname_th || ""} ${c.lastname_th || ""}`.trim() || c.employee_code || "-"}</p>
                      <p className="text-xs text-muted-foreground">{c.contract_type || "-"}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {new Date(c.end_date || c.expiryDate).toLocaleDateString()}
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
              {t("dashboard.alerts.pendingApprovals")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(pendingApprovals || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.alerts.noPendingApprovals")}</p>
              ) : (
                (pendingApprovals || []).slice(0, 5).map((approval: any) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <div>
                      <p className="text-sm font-medium">{approval.requester_name || `User #${approval.requested_by}`}</p>
                      <p className="text-xs text-muted-foreground">{approval.approval_type || "request"} - {approval.request_reason || "-"}</p>
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
            {t("dashboard.alerts.upcomingHolidays")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingHolidays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center col-span-full">{t("dashboard.alerts.noUpcomingHolidays")}</p>
            ) : (
              upcomingHolidays.map((holiday: any) => (
                <div key={holiday.id} className="p-3 rounded-lg border border-green-200 bg-green-50">
                  <p className="text-sm font-medium text-green-900">{holiday.holiday_name_th || holiday.name || "-"}</p>
                  <p className="text-xs text-green-700 mt-1">{new Date(holiday.holiday_date || holiday.date).toLocaleDateString()}</p>
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
