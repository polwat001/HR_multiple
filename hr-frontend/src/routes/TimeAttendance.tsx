import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { resolveRoleViewKey } from "@/lib/accessMatrix";

type ShiftRow = {
  id: number;
  shiftName: string;
  timeIn: string;
  timeOut: string;
  graceMinutes: number;
  companyName: string;
  employeeNames: string[];
};

type ApprovalRow = {
  id: number;
  approval_type?: string;
  requester_name?: string;
  department_name?: string;
  request_reason?: string;
  requested_date?: string;
  status?: string;
};

const toUiAttendanceRow = (row: any) => ({
  id: Number(row.id),
  userId: row.user_id ? Number(row.user_id) : null,
  workDate: row.work_date || "-",
  code: row.employee_code || "-",
  name: `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim() || "-",
  shiftId: row.shift_id ? Number(row.shift_id) : null,
  shiftName: row.shift_name || "Unassigned Shift",
  shiftTimeIn: row.shift_time_in || "-",
  shiftTimeOut: row.shift_time_out || "-",
  timeIn: row.check_in_time || "-",
  timeOut: row.check_out_time || "-",
  status: String(row.status || "present").toLowerCase(),
  gps: row.gps || "-",
});

const otRequests = [
  {
    id: 1,
    employeeName: "สมหญิง ใจดี",
    requestDate: "2026-03-10",
    startTime: "18:30",
    endTime: "21:00",
    totalHours: 2.5,
    reason: "ปิดงาน Payroll ประจำเดือน",
    approverName: "วิชัย พงษ์ทอง",
    status: "pending",
  },
  {
    id: 2,
    employeeName: "ประสิทธิ์ แก้วมณี",
    requestDate: "2026-03-09",
    startTime: "17:30",
    endTime: "20:30",
    totalHours: 3,
    reason: "Deploy ระบบ attendance ใหม่",
    approverName: "วิชัย พงษ์ทอง",
    status: "pending",
  },
  {
    id: 3,
    employeeName: "ธนา รุ่งเรือง",
    requestDate: "2026-03-08",
    startTime: "18:00",
    endTime: "19:30",
    totalHours: 1.5,
    reason: "แก้ incident production",
    approverName: "พิมพ์ชนก ศิริวัฒน์",
    status: "approved",
  },
];

const toUiOtRow = (row: any) => ({
  id: Number(row.id),
  userId: row.user_id ? Number(row.user_id) : null,
  employeeName: `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim() || row.employee_code || "-",
  requestDate: row.request_date || "-",
  startTime: row.start_time || "-",
  endTime: row.end_time || "-",
  totalHours: Number(row.total_hours || 0),
  reason: row.reason || "-",
  approverName: row.approver_name || "รอผู้อนุมัติ",
  status: String(row.status || "pending").toLowerCase(),
});

const statusBadge: Record<string, string> = {
  present: "bg-success/10 text-success",
  late: "bg-warning/10 text-warning",
  absent: "bg-destructive/10 text-destructive",
  missing_scan: "bg-orange-100 text-orange-700",
};

const otStatusBadge: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const TimeAttendance = () => {
  const { hasPermission, hasRole, user } = useAuth();
  const roleViewKey = resolveRoleViewKey(user as any);
  const isManagerView = roleViewKey === "manager";
  const ownUserId = Number((user as any)?.user_id || 0);
  const canCreateShift = roleViewKey === "hr_company" || roleViewKey === "central_hr" || roleViewKey === "super_admin";
  const canRequestOt = hasPermission(Permission.REQUEST_OT);
  const canApproveOt = hasPermission(Permission.APPROVE_DEPARTMENT_OT) || hasPermission(Permission.MANAGE_COMPANY_OT) || hasPermission(Permission.MANAGE_ALL_OT);
  const canEditTeamShift = hasPermission(Permission.MANAGE_ATTENDANCE);
  const canRunOtPayrollPrep = hasPermission(Permission.MANAGE_COMPANY_OT) || hasPermission(Permission.MANAGE_ALL_OT);
  const isEmployeeOnly =
    hasPermission(Permission.VIEW_OWN_ATTENDANCE) &&
    !hasPermission(Permission.VIEW_DEPARTMENT_ATTENDANCE) &&
    !hasPermission(Permission.VIEW_COMPANY_ATTENDANCE) &&
    !hasPermission(Permission.MANAGE_ATTENDANCE);
  const canManageAdjustments = !isEmployeeOnly;

  const [scheduleRows, setScheduleRows] = useState<ShiftRow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [adjustmentRows, setAdjustmentRows] = useState<ApprovalRow[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [selectedAttendanceShift, setSelectedAttendanceShift] = useState("all");
  const [newShift, setNewShift] = useState({
    shiftName: "",
    timeIn: "",
    timeOut: "",
    graceMinutes: "0",
  });
  const [isCreatingShift, setIsCreatingShift] = useState(false);
  const [otRows, setOtRows] = useState(otRequests);
  const [newOt, setNewOt] = useState({
    requestDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });
  const [isSubmittingOt, setIsSubmittingOt] = useState(false);
  const [showEmployeeOtForm, setShowEmployeeOtForm] = useState(false);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState<"check-in" | "check-out" | null>(null);
  const [attendanceActionMessage, setAttendanceActionMessage] = useState("");
  const [employeeOtRows, setEmployeeOtRows] = useState<Array<{
    id: number;
    requestDate: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    reason: string;
    status: "pending" | "approved";
  }>>([]);

  const fetchOt = useCallback(async () => {
      try {
        const res = await apiGet<any>("/ot/requests");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setOtRows(rows.map(toUiOtRow));
      } catch (error) {
        console.error("Failed to fetch OT requests:", error);
      }
    }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      setSchedulesLoading(true);
      const res = await apiGet<any>("/schedules");
      const rows = Array.isArray(res) ? res : res?.data || [];

      const shiftsWithEmployees: ShiftRow[] = await Promise.all(
        rows.map(async (row: any) => {
          let names: string[] = [];
          try {
            const employeeRes = await apiGet<any>(`/schedules/${row.id}/employees`);
            const employeeRows = Array.isArray(employeeRes) ? employeeRes : employeeRes?.data || [];
            names = employeeRows.map((emp: any) => `${emp.firstname_th || ""} ${emp.lastname_th || ""}`.trim()).filter(Boolean);
          } catch (error) {
            console.error("Failed to fetch schedule employees:", error);
          }

          return {
            id: Number(row.id),
            shiftName: row.shift_name || row.name || `Shift #${row.id}`,
            timeIn: row.time_in || "-",
            timeOut: row.time_out || "-",
            graceMinutes: Number(row.grace_period_mins || 0),
            companyName: row.company_name || "-",
            employeeNames: names,
          };
        })
      );

      setScheduleRows(shiftsWithEmployees);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  const fetchAdjustmentApprovals = useCallback(async () => {
    try {
      setAdjustmentsLoading(true);
      const res = await apiGet<any>("/approvals/pending");
      const rows = Array.isArray(res) ? res : res?.data || [];
      const attendanceAdjustments = rows.filter((item: any) => {
        const type = String(item?.approval_type || "").toLowerCase();
        return type.includes("attendance") || type.includes("adjust") || type.includes("time");
      });
      setAdjustmentRows(attendanceAdjustments);
    } catch (error) {
      console.error("Failed to fetch adjustment approvals:", error);
      setAdjustmentRows([]);
    } finally {
      setAdjustmentsLoading(false);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
      try {
        const res = await apiGet<any>("/attendance");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setAttendanceRows(rows.map(toUiAttendanceRow));
      } catch (error) {
        console.error("Failed to fetch attendance logs:", error);
      }
    }, []);

  useEffect(() => {
    const run = async () => {
      await Promise.all([fetchOt(), fetchAttendance(), fetchSchedules(), fetchAdjustmentApprovals()]);
    };

    run();
  }, [fetchOt, fetchAttendance, fetchSchedules, fetchAdjustmentApprovals]);

  const handleCreateShift = async () => {
    if (!canCreateShift) {
      alert("คุณไม่มีสิทธิ์สร้างกะเวลา");
      return;
    }
    if (!newShift.shiftName || !newShift.timeIn || !newShift.timeOut) {
      alert("กรุณากรอกชื่อกะ เวลาเข้า และเวลาออกให้ครบ");
      return;
    }

    try {
      setIsCreatingShift(true);
      await apiPost("/schedules", {
        shift_name: newShift.shiftName,
        time_in: newShift.timeIn,
        time_out: newShift.timeOut,
        grace_period_mins: Number(newShift.graceMinutes || 0),
      });
      setNewShift({ shiftName: "", timeIn: "", timeOut: "", graceMinutes: "0" });
      await fetchSchedules();
      alert("สร้างกะเวลาเรียบร้อยแล้ว");
    } catch (error: any) {
      alert(error?.message || "ไม่สามารถสร้างกะเวลาได้");
    } finally {
      setIsCreatingShift(false);
    }
  };

  const handleAdjustmentDecision = async (id: number, action: "approve" | "reject") => {
    try {
      await apiPost(`/approvals/${id}/${action}`, {});
      await fetchAdjustmentApprovals();
    } catch (error) {
      console.error(`Failed to ${action} adjustment request:`, error);
      alert("ไม่สามารถอัปเดตสถานะคำขอปรับเวลาได้");
    }
  };

  const handleAttendanceAction = async (action: "check-in" | "check-out") => {
    try {
      setAttendanceActionLoading(action);
      setAttendanceActionMessage("");
      const endpoint = action === "check-in" ? "/attendance/check-in" : "/attendance/check-out";
      await apiPost(endpoint, {});
      setAttendanceActionMessage(action === "check-in" ? "ลงเวลาเข้างานสำเร็จ" : "ลงเวลาออกงานสำเร็จ");
      await fetchAttendance();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "ไม่สามารถบันทึกเวลาได้";
      setAttendanceActionMessage(message);
    } finally {
      setAttendanceActionLoading(null);
    }
  };

  const visibleScheduleRows = isEmployeeOnly ? scheduleRows.slice(0, 1) : scheduleRows;
  const teamAttendanceRows = isManagerView
    ? attendanceRows.filter((row: any) => Number(row.userId || 0) !== ownUserId)
    : attendanceRows;
  const teamOtRows = isManagerView
    ? otRows.filter((row: any) => Number(row.userId || 0) !== ownUserId)
    : otRows;

  const computedHours = useMemo(() => {
    if (!newOt.startTime || !newOt.endTime) return 0;
    const [sh, sm] = newOt.startTime.split(":").map(Number);
    const [eh, em] = newOt.endTime.split(":").map(Number);
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0;
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const diff = endMinutes - startMinutes;
    if (diff <= 0) return 0;
    return Math.round((diff / 60) * 10) / 10;
  }, [newOt.endTime, newOt.startTime]);

  const handleSubmitOt = async () => {
    if (!newOt.requestDate || !newOt.startTime || !newOt.endTime || !newOt.reason) {
      alert("กรุณากรอกข้อมูล OT Request ให้ครบ");
      return;
    }
    if (computedHours <= 0) {
      alert("เวลา OT ไม่ถูกต้อง");
      return;
    }

    try {
      setIsSubmittingOt(true);
      await apiPost<any>("/ot/request", {
        request_date: newOt.requestDate,
        start_time: newOt.startTime,
        end_time: newOt.endTime,
        reason: newOt.reason,
      });

      if (isEmployeeOnly) {
        setEmployeeOtRows((prev) => [
          {
            id: Date.now(),
            requestDate: newOt.requestDate,
            startTime: newOt.startTime,
            endTime: newOt.endTime,
            totalHours: computedHours,
            reason: newOt.reason,
            status: "pending",
          },
          ...prev,
        ]);
      }

      setOtRows((prev) => [
        {
          id: Date.now(),
          employeeName: "ผู้ใช้งานปัจจุบัน",
          requestDate: newOt.requestDate,
          startTime: newOt.startTime,
          endTime: newOt.endTime,
          totalHours: computedHours,
          reason: newOt.reason,
          approverName: "รอผู้อนุมัติ",
          status: "pending",
        },
        ...prev,
      ]);

      setNewOt({ requestDate: "", startTime: "", endTime: "", reason: "" });
      setShowEmployeeOtForm(false);
      alert("ส่งคำขอ OT เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Create OT request failed:", error);
      alert("ไม่สามารถส่งคำขอ OT ได้");
    } finally {
      setIsSubmittingOt(false);
    }
  };

  const handleUpdateOtStatus = (id: number, status: "approved" | "rejected") => {
    const run = async () => {
      try {
        await apiPut(`/ot/${id}/status`, { status });
        setOtRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
      } catch (error) {
        console.error("Failed to update OT status:", error);
        alert("ไม่สามารถอัปเดตสถานะ OT ได้");
      }
    };
    run();
  };

  const handleGracePeriodChange = (id: number, value: string) => {
    const next = Number(value);
    if (Number.isNaN(next) || next < 0) return;
    setScheduleRows((prev) => prev.map((row) => (row.id === id ? { ...row, graceMinutes: next } : row)));
  };

  if (isEmployeeOnly) {
    const myShift = visibleScheduleRows[0];
    const latestAttendance = attendanceRows[0];
    const todayString = new Date().toISOString().slice(0, 10);
    const todayAttendance = attendanceRows.find((row) => row.workDate === todayString);
    const hasCheckedInToday = Boolean(todayAttendance?.timeIn && todayAttendance.timeIn !== "-");
    const hasCheckedOutToday = Boolean(todayAttendance?.timeOut && todayAttendance.timeOut !== "-");
    const checkInDisabled = attendanceActionLoading !== null || hasCheckedInToday;
    const checkOutDisabled = attendanceActionLoading !== null || !hasCheckedInToday || hasCheckedOutToday;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">พนักงาน</span>
          <span className="text-muted-foreground">ดูเฉพาะตารางของคุณ</span>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">ตารางงานของคุณ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/40 border border-border px-6 py-4 text-center">
              <p className="font-semibold text-foreground">{myShift?.shiftName || "-"}</p>
              <p className="text-3xl font-bold text-primary mt-1">{myShift?.timeIn || "-"} - {myShift?.timeOut || "-"}</p>
              <p className="text-sm text-muted-foreground mt-1">พัก 12:00 - 13:00</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">ลงเวลาเข้า-ออกงาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => handleAttendanceAction("check-in")}
                disabled={checkInDisabled}
              >
                {attendanceActionLoading === "check-in"
                  ? "กำลังบันทึก..."
                  : hasCheckedInToday
                    ? "Check In แล้ววันนี้"
                    : "Check In"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAttendanceAction("check-out")}
                disabled={checkOutDisabled}
              >
                {attendanceActionLoading === "check-out"
                  ? "กำลังบันทึก..."
                  : hasCheckedOutToday
                    ? "Check Out แล้ววันนี้"
                    : "Check Out"}
              </Button>
            </div>

            {attendanceActionMessage ? (
              <p className="text-sm text-muted-foreground">{attendanceActionMessage}</p>
            ) : null}

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground mb-1">
                สถานะวันนี้: {hasCheckedOutToday ? "ลงเวลาครบแล้ว" : hasCheckedInToday ? "ลงเวลาเข้าแล้ว" : "ยังไม่ลงเวลา"}
              </p>
              <p className="text-sm text-muted-foreground">รายการล่าสุด</p>
              <p className="text-sm mt-1">วันที่: {latestAttendance?.workDate || "-"}</p>
              <p className="text-sm">เข้า: {latestAttendance?.timeIn || "-"} | ออก: {latestAttendance?.timeOut || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">คำขอ OT ของคุณ</CardTitle>
            <Button size="sm" onClick={() => setShowEmployeeOtForm((v) => !v)}>
              + ขอ OT
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showEmployeeOtForm && (
              <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">วันที่ขอทำ OT</p>
                    <Input type="date" value={newOt.requestDate} onChange={(e) => setNewOt((p) => ({ ...p, requestDate: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">เวลาเริ่มต้น</p>
                      <Input type="time" value={newOt.startTime} onChange={(e) => setNewOt((p) => ({ ...p, startTime: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">เวลาสิ้นสุด</p>
                      <Input type="time" value={newOt.endTime} onChange={(e) => setNewOt((p) => ({ ...p, endTime: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">เหตุผลที่ขอ OT</p>
                  <Textarea value={newOt.reason} onChange={(e) => setNewOt((p) => ({ ...p, reason: e.target.value }))} />
                </div>
                <div className="text-sm text-muted-foreground">จำนวนชั่วโมงรวม: <span className="font-semibold text-foreground">{computedHours} ชั่วโมง</span></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmitOt} disabled={isSubmittingOt}>{isSubmittingOt ? "กำลังส่ง..." : "ยืนยันส่งคำขอ"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowEmployeeOtForm(false)}>ยกเลิก</Button>
                </div>
              </div>
            )}

            {employeeOtRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ดูคำขอ OT ได้ที่หน้า Self-Service</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">วันที่</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">เวลา</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">ชั่วโมง</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeOtRows.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{r.requestDate}</td>
                      <td className="px-3 py-2">{r.startTime} - {r.endTime}</td>
                      <td className="px-3 py-2">{r.totalHours} ชม.</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={otStatusBadge[r.status] || ""}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">ประวัติการลงเวลาของคุณ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">วันที่</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">เวลาเข้า</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">เวลาออก</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">ยังไม่มีข้อมูลการลงเวลา</td>
                  </tr>
                ) : (
                  attendanceRows.slice(0, 20).map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs">{a.workDate}</td>
                      <td className="px-4 py-3">{a.timeIn}</td>
                      <td className="px-4 py-3">{a.timeOut}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusBadge[a.status] || ""}>{a.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="shifts">
        <TabsList>
          <TabsTrigger value="shifts">Work Schedule</TabsTrigger>
          {!isEmployeeOnly && <TabsTrigger value="attendance">Attendance Log</TabsTrigger>}
          {canManageAdjustments && <TabsTrigger value="adjustments">Adjustment Requests</TabsTrigger>}
          {canRequestOt && <TabsTrigger value="ot-request">OT Request</TabsTrigger>}
          {canApproveOt && <TabsTrigger value="ot-approval">คำร้องของลูกทีม (OT)</TabsTrigger>}
        </TabsList>

      <TabsContent value="shifts" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Shift Management</CardTitle>
            <Badge variant="outline">Total Shifts: {visibleScheduleRows.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {canCreateShift && (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-medium">เพิ่มกะเวลาใหม่</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ชื่อกะ</p>
                    <Input value={newShift.shiftName} onChange={(e) => setNewShift((p) => ({ ...p, shiftName: e.target.value }))} placeholder="เช่น กะเช้า" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">เวลาเข้า</p>
                    <Input type="time" value={newShift.timeIn} onChange={(e) => setNewShift((p) => ({ ...p, timeIn: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">เวลาออก</p>
                    <Input type="time" value={newShift.timeOut} onChange={(e) => setNewShift((p) => ({ ...p, timeOut: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Grace (นาที)</p>
                    <Input type="number" value={newShift.graceMinutes} onChange={(e) => setNewShift((p) => ({ ...p, graceMinutes: e.target.value }))} min={0} />
                  </div>
                </div>
                <Button onClick={handleCreateShift} disabled={isCreatingShift}>
                  {isCreatingShift ? "กำลังบันทึก..." : "สร้างกะเวลา"}
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Shift</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grace</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employees In Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading shifts...</td>
                    </tr>
                  ) : visibleScheduleRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">ไม่พบข้อมูลกะเวลา</td>
                    </tr>
                  ) : (
                    visibleScheduleRows.map((s) => (
                      <tr key={s.id} className="border-b last:border-b-0 align-top">
                        <td className="px-4 py-3 font-medium">{s.shiftName}</td>
                        <td className="px-4 py-3">{s.timeIn} - {s.timeOut}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={s.graceMinutes}
                            onChange={(e) => handleGracePeriodChange(s.id, e.target.value)}
                            disabled={!canEditTeamShift}
                            className="max-w-24"
                          />
                        </td>
                        <td className="px-4 py-3">{s.companyName}</td>
                        <td className="px-4 py-3">
                          {s.employeeNames.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {s.employeeNames.map((name, idx) => (
                                <Badge key={`${s.id}-${idx}`} variant="outline" className="text-xs">{name}</Badge>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {!isEmployeeOnly && (
      <TabsContent value="attendance" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attendance Log</CardTitle>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedAttendanceShift}
                onChange={(e) => setSelectedAttendanceShift(e.target.value)}
              >
                <option value="all">ทุกกะเวลา</option>
                {scheduleRows.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.shiftName}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Upload className="h-4 w-4" /> Import File
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(
              teamAttendanceRows
                .filter((a) => selectedAttendanceShift === "all" || String(a.shiftId || "") === selectedAttendanceShift)
                .reduce((acc: Record<string, any[]>, row: any) => {
                  const key = row.shiftName || "Unassigned Shift";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(row);
                  return acc;
                }, {})
            ).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">ไม่พบข้อมูล Attendance ตามกะที่เลือก</div>
            ) : (
              Object.entries(
                teamAttendanceRows
                  .filter((a) => selectedAttendanceShift === "all" || String(a.shiftId || "") === selectedAttendanceShift)
                  .reduce((acc: Record<string, any[]>, row: any) => {
                    const key = row.shiftName || "Unassigned Shift";
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(row);
                    return acc;
                  }, {})
              ).map(([shiftName, rows]) => (
                <div key={shiftName} className="rounded-lg border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/40 text-sm font-medium">{shiftName} ({rows.length} คน)</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Code</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Scan In</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Scan Out</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((a: any) => (
                        <tr key={a.id} className="border-b last:border-b-0">
                          <td className="px-4 py-2 font-mono text-xs">{a.workDate}</td>
                          <td className="px-4 py-2 font-mono text-xs">{a.code}</td>
                          <td className="px-4 py-2">{a.name}</td>
                          <td className="px-4 py-2">{a.timeIn}</td>
                          <td className="px-4 py-2">{a.timeOut}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className={statusBadge[a.status]}>{a.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canManageAdjustments && (
      <TabsContent value="adjustments" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attendance Adjustment Requests</CardTitle>
            <Button size="sm" variant="outline" onClick={fetchAdjustmentApprovals}>Refresh</Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requester</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested At</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {adjustmentsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading adjustment requests...</td>
                  </tr>
                ) : adjustmentRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ไม่มีคำขอปรับเวลาที่รออนุมัติ</td>
                  </tr>
                ) : (
                  adjustmentRows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{row.requester_name || "-"}</td>
                      <td className="px-4 py-3">{row.approval_type || "-"}</td>
                      <td className="px-4 py-3">{row.department_name || "-"}</td>
                      <td className="px-4 py-3 max-w-[300px] truncate" title={row.request_reason || ""}>{row.request_reason || "-"}</td>
                      <td className="px-4 py-3">{row.requested_date ? new Date(row.requested_date).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success bg-success/10 hover:bg-success/20" onClick={() => handleAdjustmentDecision(row.id, "approve")}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive bg-destructive/10 hover:bg-destructive/20" onClick={() => handleAdjustmentDecision(row.id, "reject")}><X className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canRequestOt && (
      <TabsContent value="ot-request" className="mt-4">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Submit OT Request</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">วันที่ขอทำ OT</p>
                  <Input type="date" value={newOt.requestDate} onChange={(e) => setNewOt((p) => ({ ...p, requestDate: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">เวลาเริ่มต้น</p>
                    <Input type="time" value={newOt.startTime} onChange={(e) => setNewOt((p) => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">เวลาสิ้นสุด</p>
                    <Input type="time" value={newOt.endTime} onChange={(e) => setNewOt((p) => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">เหตุผลที่ขอ OT</p>
                <Textarea value={newOt.reason} onChange={(e) => setNewOt((p) => ({ ...p, reason: e.target.value }))} />
              </div>
              <div className="text-sm text-muted-foreground">จำนวนชั่วโมงรวม: <span className="font-semibold text-foreground">{computedHours} ชั่วโมง</span></div>
              <Button size="sm" onClick={handleSubmitOt} disabled={isSubmittingOt}>{isSubmittingOt ? "กำลังส่ง..." : "Create OT Request"}</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canApproveOt && (
        <TabsContent value="ot-approval" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">คำร้องของลูกทีม (OT)</CardTitle>
            {canRunOtPayrollPrep && (
              <Button size="sm" variant="outline">คำนวณสรุป OT เพื่อส่ง Payroll</Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Request Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start-End</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total Hours</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Approver</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr></thead>
              <tbody>
                {teamOtRows.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{o.employeeName}</td>
                    <td className="px-4 py-3">{o.requestDate}</td>
                    <td className="px-4 py-3">{o.startTime} - {o.endTime}</td>
                    <td className="px-4 py-3">{o.totalHours}h</td>
                    <td className="px-4 py-3 max-w-[240px] truncate" title={o.reason}>{o.reason}</td>
                    <td className="px-4 py-3">{o.approverName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={otStatusBadge[o.status] || ""}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {o.status === "pending" ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success bg-success/10 hover:bg-success/20" onClick={() => handleUpdateOtStatus(o.id, "approved")}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive bg-destructive/10 hover:bg-destructive/20" onClick={() => handleUpdateOtStatus(o.id, "rejected")}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs capitalize">{o.status}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        </TabsContent>
      )}
    </Tabs>
  </div>
  );
};

export default TimeAttendance;
