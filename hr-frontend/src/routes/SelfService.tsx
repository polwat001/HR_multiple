import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Clock, CalendarDays, Briefcase, User, Building, Timer } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const statusColors: Record<string, string> = {
  present: "bg-emerald-500",
  late: "bg-amber-400",
  absent: "bg-red-400",
  leave: "bg-blue-400",
};

const LEAVE_COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--info))"];

const getCurrentMonthString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

interface EmployeeProfile {
  id: number;
  user_id?: number;
  employee_code?: string;
  firstname_th?: string;
  lastname_th?: string;
  position_name?: string;
  department_name?: string;
  company_name?: string;
  joined_date?: string;
  status?: string;
}

interface AttendanceRow {
  id: number;
  work_date: string;
  check_in_time?: string;
  check_out_time?: string;
  status?: string;
}

interface LeaveBalanceRow {
  id: number;
  quota: number;
  used: number;
  leave_type_name: string;
}

interface OtRequestRow {
  id: number;
  request_date: string;
  hours: number;
  amount: number;
  status: "pending" | "approved";
}

interface OtSummary {
  total_hours: number;
  approved_hours: number;
  estimated_amount: number;
  estimated_total_amount: number;
}

const normalizeText = (value?: string | null) => String(value || "").trim().toLowerCase();

const SelfService = () => {
  const { user: authUser } = useAuth();
  const { language, t } = useLanguage();
  const statusLabels: Record<string, string> = {
    present: t("selfService.attendance.present"),
    late: t("selfService.attendance.late"),
    absent: t("selfService.attendance.absent"),
    leave: t("selfService.attendance.leave"),
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString);
  const [initialLoading, setInitialLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceRow[]>([]);
  const [otRecords, setOtRecords] = useState<OtRequestRow[]>([]);
  const [otSummary, setOtSummary] = useState<OtSummary>({
    total_hours: 0,
    approved_hours: 0,
    estimated_amount: 0,
    estimated_total_amount: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!hasLoadedOnce) {
          setInitialLoading(true);
        } else {
          setMonthLoading(true);
        }

        const month = selectedMonth;
        const [empRes, attendanceRes, balanceRes, otReqRes] = await Promise.all([
          apiGet<any>("/employees"),
          apiGet<any>("/attendance"),
          apiGet<any>("/leaves/balances"),
          apiGet<any>(`/ot/requests?month=${month}`),
        ]);

        const empList: EmployeeProfile[] = Array.isArray(empRes) ? empRes : (empRes?.data || []);
        const attendanceList: AttendanceRow[] = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes?.data || []);
        const balanceList: LeaveBalanceRow[] = Array.isArray(balanceRes) ? balanceRes : (balanceRes?.data || []);
        const otList: OtRequestRow[] = Array.isArray(otReqRes) ? otReqRes : (otReqRes?.data || []);
        const ownProfile =
          empList.find((e) => String(e.user_id) === String(authUser?.user_id)) ||
          empList[0] ||
          null;

        const ownEmployeeCode = normalizeText(ownProfile?.employee_code);
        const ownFirstName = normalizeText(ownProfile?.firstname_th);
        const ownLastName = normalizeText(ownProfile?.lastname_th);
        const ownDisplayName = normalizeText([ownProfile?.firstname_th, ownProfile?.lastname_th].filter(Boolean).join(" "));

        const ownAttendance = attendanceList.filter((row: any) => {
          const rowCode = normalizeText(row?.employee_code);
          const rowName = normalizeText([row?.firstname_th, row?.lastname_th].filter(Boolean).join(" "));

          if (ownEmployeeCode && rowCode) return rowCode === ownEmployeeCode;
          if (ownDisplayName && rowName) return rowName === ownDisplayName;
          return true;
        });

        const ownLeaveBalances = balanceList.filter((row: any) => {
          const rowFirst = normalizeText(row?.firstname_th);
          const rowLast = normalizeText(row?.lastname_th);

          if (ownFirstName || ownLastName) {
            return rowFirst === ownFirstName && rowLast === ownLastName;
          }

          return true;
        });

        const ownOtRecords = otList.filter((row: any) => {
          const rowCode = normalizeText(row?.employee_code);
          const rowName = normalizeText([row?.firstname_th, row?.lastname_th].filter(Boolean).join(" "));

          if (ownEmployeeCode && rowCode) return rowCode === ownEmployeeCode;
          if (ownDisplayName && rowName) return rowName === ownDisplayName;
          return true;
        });

        const ownTotalHours = ownOtRecords.reduce((sum: number, row: any) => sum + Number(row?.total_hours || row?.hours || 0), 0);
        const ownApprovedHours = ownOtRecords.reduce(
          (sum: number, row: any) => sum + (String(row?.status || "").toLowerCase() === "approved" ? Number(row?.total_hours || row?.hours || 0) : 0),
          0
        );
        const ownTotalAmount = ownOtRecords.reduce((sum: number, row: any) => sum + Number(row?.amount || 0), 0);
        const ownApprovedAmount = ownOtRecords.reduce(
          (sum: number, row: any) => sum + (String(row?.status || "").toLowerCase() === "approved" ? Number(row?.amount || 0) : 0),
          0
        );

        setProfile(ownProfile);
        setAttendanceRows(ownAttendance);
        setLeaveBalances(ownLeaveBalances);
        setOtRecords(
          ownOtRecords.map((r: any) => ({
            id: Number(r.id),
            request_date: String(r.request_date || ""),
            hours: Number(r.total_hours || r.hours || 0),
            amount: Number(r.amount || 0),
            status: String(r.status || "pending") === "approved" ? "approved" : "pending",
          }))
        );
        setOtSummary({
          total_hours: ownTotalHours,
          approved_hours: ownApprovedHours,
          estimated_amount: ownApprovedAmount,
          estimated_total_amount: ownTotalAmount,
        });
      } catch (error) {
        console.error("Failed to load self-service data:", error);
      } finally {
        setInitialLoading(false);
        setMonthLoading(false);
        setHasLoadedOnce(true);
      }
    };

    fetchData();
  }, [authUser?.user_id, selectedMonth]);

  const displayName = useMemo(() => {
    const fullName = [profile?.firstname_th, profile?.lastname_th].filter(Boolean).join(" ").trim();
    return fullName || authUser?.display_name || authUser?.username || "-";
  }, [profile?.firstname_th, profile?.lastname_th, authUser?.display_name, authUser?.username]);

  const joinedDate = profile?.joined_date;

  const tenure = useMemo(() => {
    if (!joinedDate) return "-";
    const hire = new Date(joinedDate);
    if (Number.isNaN(hire.getTime())) return "-";
    const now = new Date();
    const years = now.getFullYear() - hire.getFullYear();
    const months = now.getMonth() - hire.getMonth();
    const totalMonths = years * 12 + months;
    return `${Math.floor(totalMonths / 12)} ${t("selfService.yearUnit")} ${totalMonths % 12} ${t("selfService.monthUnit")}`;
  }, [joinedDate, t]);

  const calendarData = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const year = Number.isFinite(y) ? y : new Date().getFullYear();
    const month = Number.isFinite(m) ? m - 1 : new Date().getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const attendanceMap = new Map(attendanceRows.map((a) => [a.work_date, a]));
    const cells: { day: number; record?: AttendanceRow }[] = [];

    for (let i = 0; i < firstDay; i++) cells.push({ day: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, record: attendanceMap.get(dateStr) });
    }

    return cells;
  }, [attendanceRows, selectedMonth]);

  const monthTitle = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date((Number.isFinite(y) ? y : new Date().getFullYear()), (Number.isFinite(m) ? m : new Date().getMonth() + 1) - 1, 1);
    return d.toLocaleDateString(language === "th" ? "th-TH" : "en-US", { month: "long", year: "numeric" });
  }, [language, selectedMonth]);

  const otTotal = otSummary.total_hours;
  const otAmount = otSummary.estimated_total_amount;

  if (initialLoading) {
    return <div className="p-6 text-center text-muted-foreground">{t("selfService.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">{t("selfService.title")}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("selfService.monthData")}</span>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-[180px]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth(getCurrentMonthString())}
            disabled={selectedMonth === getCurrentMonthString()}
          >
            {t("selfService.thisMonth")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
            {displayName?.[0] || "U"}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-semibold text-foreground">
              {displayName}
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{profile?.position_name || authUser?.position_name || "-"}</span>
              <span className="flex items-center gap-1"><Building className="h-4 w-4" />{profile?.department_name || "-"} - {profile?.company_name || "-"}</span>
              <span className="flex items-center gap-1"><User className="h-4 w-4" />{profile?.employee_code || "-"}</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{t("selfService.jobInfo.tenure")} {tenure}</span>
            </div>
          </div>
          <Badge variant={profile?.status === "active" ? "default" : "secondary"}>{profile?.status || "-"}</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-0 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("selfService.leaveQuota")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </div>
            )}
            {!monthLoading && (
              <>
                {leaveBalances.map((lq, i) => {
                  const pieData = [
                    { name: t("selfService.used"), value: lq.used },
                    { name: t("selfService.remaining"), value: lq.quota - lq.used },
                  ];
                  return (
                    <div key={lq.id} className="flex items-center gap-4">
                      <div className="w-16 h-16">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={18} outerRadius={28} dataKey="value" strokeWidth={0}>
                              <Cell fill={LEAVE_COLORS[i % LEAVE_COLORS.length]} />
                              <Cell fill="hsl(var(--muted))" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{lq.leave_type_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("selfService.used")} {lq.used} / {lq.quota} {t("selfService.dayUnit")} - {t("selfService.remaining")} {Math.max(0, lq.quota - lq.used)} {t("selfService.dayUnit")}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {leaveBalances.length === 0 && <p className="text-sm text-muted-foreground">{t("selfService.noLeaveQuota")}</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> {t("selfService.attendance.title")} - {monthTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
              {(language === "th" ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((d) => (
                <div key={d} className="font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((cell, idx) =>
                cell.day === 0 ? (
                  <div key={idx} />
                ) : (
                  <div
                    key={idx}
                    className="rounded-md border border-border p-1 text-center min-h-[56px] flex flex-col items-center justify-center"
                    title={
                      cell.record
                        ? `${statusLabels[String(cell.record.status || "present")] || t("selfService.attendance.present")} ${cell.record.check_in_time || "-"} - ${cell.record.check_out_time || "-"}`
                        : undefined
                    }
                  >
                    <span className="text-xs text-muted-foreground">{cell.day}</span>
                    {cell.record && (
                      <>
                        <span className={`inline-block mt-0.5 h-2.5 w-2.5 rounded-full ${statusColors[String(cell.record.status || "present")] || "bg-emerald-500"}`} />
                        {cell.record.check_in_time !== "-" && (
                          <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                            {cell.record.check_in_time}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )
              )}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {Object.entries(statusLabels).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusColors[k] || "bg-emerald-500"}`} /> {v}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" /> {t("selfService.otSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 mb-4">
            <div className="bg-primary/10 rounded-lg px-4 py-3 text-center">
              <div className="text-2xl font-bold text-primary">{otTotal}</div>
              <div className="text-xs text-muted-foreground">{t("selfService.otHours")}</div>
            </div>
            <div className="bg-primary/10 rounded-lg px-4 py-3 text-center">
              <div className="text-2xl font-bold text-primary">฿{otAmount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("selfService.otValue")}</div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("selfService.otTable.date")}</TableHead>
                <TableHead>{t("selfService.otTable.hours")}</TableHead>
                <TableHead>{t("selfService.otTable.amount")}</TableHead>
                <TableHead>{t("selfService.otTable.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthLoading && (
                <>
                  <TableRow>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  </TableRow>
                </>
              )}
              {!monthLoading && (
                <>
              {otRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.request_date}</TableCell>
                  <TableCell>{r.hours} {t("selfService.hourAbbr")}</TableCell>
                  <TableCell>฿{r.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "approved" ? "default" : "secondary"}>
                      {r.status === "approved" ? t("selfService.otStatus.approved") : r.status === "pending" ? t("selfService.otStatus.pending") : t("selfService.otStatus.rejected")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {otRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">{t("selfService.noOtData")}</TableCell>
                </TableRow>
              )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfService;
